"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  ExternalLink,
  Inbox,
  MoreHorizontal,
  Pencil,
  Trash2,
  Unplug,
} from "lucide-react";
import { useRef, useState } from "react";
import { formsApi } from "@/lib/api/client";
import type { FormCard } from "@/lib/contracts";
import { Modal } from "@/components/ui/modal";

export function FormActions({ form }: { form: FormCard }) {
  const client = useQueryClient();
  const disclosure = useRef<HTMLDetailsElement>(null);
  const [action, setAction] = useState<
    "rename" | "duplicate" | "delete" | "unpublish" | null
  >(null);
  const [title, setTitle] = useState(form.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function open(next: typeof action) {
    if (disclosure.current) disclosure.current.open = false;
    setTitle(form.title);
    setError("");
    setAction(next);
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      if (action === "rename")
        await formsApi.rename(form.id, title.trim(), form.draft_revision);
      if (action === "duplicate") await formsApi.duplicate(form.id);
      if (action === "delete") await formsApi.delete(form.id);
      if (action === "unpublish") await formsApi.unpublish(form.id);
      await client.invalidateQueries({ queryKey: ["forms"] });
      await client.invalidateQueries({ queryKey: ["form", form.id] });
      setAction(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not complete this action.",
      );
      await client.invalidateQueries({ queryKey: ["forms"] });
    } finally {
      setBusy(false);
    }
  }
  const labels = {
    rename: "Rename form",
    duplicate: "Duplicate form",
    delete: "Delete form",
    unpublish: "Unpublish form",
  };
  return (
    <>
      <details
        className="form-actions"
        ref={disclosure}
        onKeyDown={(event) => {
          if (event.key === "Escape" && disclosure.current) {
            disclosure.current.open = false;
            disclosure.current.querySelector("summary")?.focus();
          }
        }}
      >
        <summary aria-label={`Actions for ${form.title}`}>
          <MoreHorizontal size={18} />
        </summary>
        <div className="form-action-menu">
          <button onClick={() => open("rename")}>
            <Pencil size={15} />
            Rename
          </button>
          <button onClick={() => open("duplicate")}>
            <Copy size={15} />
            Duplicate
          </button>
          <Link href={`/forms/${form.id}/results`}>
            <Inbox size={15} />
            Responses
          </Link>
          {form.status === "published" && (
            <>
              <a href={`/to/${form.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink size={15} />
                Open public form
              </a>
              <button onClick={() => open("unpublish")}>
                <Unplug size={15} />
                Unpublish
              </button>
            </>
          )}
          <button className="destructive-text" onClick={() => open("delete")}>
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </details>
      <Modal
        open={action !== null}
        onOpenChange={(next) => {
          if (!next && !busy) setAction(null);
        }}
        title={action ? labels[action] : "Form action"}
        description={
          action === "delete"
            ? `Delete “${form.title}” and all ${form.response_count} stored responses? This cannot be undone.`
            : action === "unpublish"
              ? "The public link will stop accepting new responses. Existing results remain available."
              : action === "duplicate"
                ? "Create a separate draft with new question IDs. Responses and publication history stay with the original."
                : "Give your conversation a new name."
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          {action === "rename" && (
            <>
              <label className="field-label" htmlFor={`rename-${form.id}`}>
                Form name
              </label>
              <input
                id={`rename-${form.id}`}
                className="text-field"
                value={title}
                maxLength={200}
                required
                onChange={(event) => setTitle(event.target.value)}
              />
            </>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Cancel
            </button>
            <button
              className={`button ${action === "delete" ? "button-danger" : "button-primary"}`}
              disabled={busy || (action === "rename" && !title.trim())}
            >
              {busy ? "Working…" : action ? labels[action] : "Confirm"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
