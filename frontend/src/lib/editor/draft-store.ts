import { ApiError, formsApi } from "@/lib/api/client";
import type { FormDefinition, FormDetail } from "@/lib/contracts";

export type SaveStatus = "saved" | "unsaved" | "saving" | "failed" | "conflict";
export type DraftSnapshot = {
  draft: FormDefinition;
  revision: number;
  metadata: FormDetail;
  status: SaveStatus;
  error: Error | null;
  dirty: boolean;
};

function definition(form: FormDetail): FormDefinition {
  return {
    title: form.title,
    theme: form.theme,
    thank_you: form.thank_you,
    questions: form.questions,
  };
}

/** One serialized queue owns every draft mutation; React subscribes to stable snapshots. */
export class DraftStore {
  private snapshot: DraftSnapshot;
  private listeners = new Set<() => void>();
  private generation = 0;
  private acknowledged = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(
    initial: FormDetail,
    private onSaved: (saved: FormDetail) => void,
  ) {
    this.snapshot = {
      draft: definition(initial),
      revision: initial.draft_revision,
      metadata: initial,
      status: "saved",
      error: null,
      dirty: false,
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  private notify(patch: Partial<DraftSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  edit = (transform: (draft: FormDefinition) => FormDefinition) => {
    const draft = transform(this.snapshot.draft);
    this.generation++;
    const blocked =
      this.snapshot.status === "conflict" || this.snapshot.status === "failed";
    this.notify({
      draft,
      dirty: true,
      status: blocked
        ? this.snapshot.status
        : this.inFlight
          ? "saving"
          : "unsaved",
    });
    this.clearTimer();
    if (!blocked)
      this.timer = setTimeout(() => {
        void this.flush().catch(() => undefined);
      }, 650);
  };

  flush = async (): Promise<number> => {
    this.clearTimer();
    if (this.snapshot.error) throw this.snapshot.error;
    if (this.inFlight) {
      await this.inFlight;
      return this.flush();
    }
    if (this.generation === this.acknowledged) return this.snapshot.revision;
    const operation = this.drain();
    this.inFlight = operation;
    try {
      await operation;
    } finally {
      this.inFlight = null;
    }
    return this.snapshot.revision;
  };

  private async drain() {
    while (this.generation > this.acknowledged) {
      const sentGeneration = this.generation;
      const draft = this.snapshot.draft;
      this.notify({ status: "saving", error: null });
      try {
        const saved = await formsApi.save(this.snapshot.metadata.id, {
          ...draft,
          expected_revision: this.snapshot.revision,
        });
        this.acknowledged = sentGeneration;
        const dirty = this.generation > this.acknowledged;
        this.notify({
          revision: saved.draft_revision,
          metadata: saved,
          dirty,
          status: dirty ? "saving" : "saved",
        });
        this.onSaved(saved);
      } catch (cause) {
        const error =
          cause instanceof Error
            ? cause
            : new Error("Your changes could not be saved.");
        this.notify({
          status:
            cause instanceof ApiError && cause.status === 409
              ? "conflict"
              : "failed",
          error,
          dirty: true,
        });
        throw error;
      }
    }
  }

  retry = async () => {
    if (this.snapshot.status === "conflict") throw this.snapshot.error;
    this.notify({ error: null, status: "unsaved" });
    return this.flush();
  };

  reset = (fresh: FormDetail) => {
    if (this.inFlight)
      throw new Error("Wait for the current save before reloading.");
    this.clearTimer();
    this.generation = 0;
    this.acknowledged = 0;
    this.notify({
      draft: definition(fresh),
      revision: fresh.draft_revision,
      metadata: fresh,
      status: "saved",
      error: null,
      dirty: false,
    });
    this.onSaved(fresh);
  };

  adoptMetadata = (fresh: FormDetail) => {
    this.notify({ metadata: fresh });
    this.onSaved(fresh);
  };
  dispose = () => {
    this.clearTimer();
  };
}
