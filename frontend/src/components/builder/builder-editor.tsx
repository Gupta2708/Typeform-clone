"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Download,
  Layers2,
  Monitor,
  Palette,
  Play,
  Plus,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { ApiError, formsApi } from "@/lib/api/client";
import type {
  Answers,
  FormDetail,
  Question,
  QuestionType,
} from "@/lib/contracts";
import { makeQuestion, hasIncompatibleSettings } from "@/lib/editor/questions";
import { useDraftEditor } from "@/hooks/use-draft-editor";
import { InlineText } from "@/components/builder/inline-text";
import { QuestionPicker } from "@/components/builder/question-picker";
import { QuestionRail } from "@/components/builder/question-rail";
import { QuestionSettings } from "@/components/builder/question-settings";
import { QuestionContent } from "@/components/player/question-widget";
import { Modal } from "@/components/ui/modal";
import { Hint } from "@/components/ui/tooltip";

export function BuilderEditor({ initial }: { initial: FormDetail }) {
  const router = useRouter();
  const editor = useDraftEditor(initial);
  const { draft: definition, store, metadata } = editor;
  const formId = metadata.id;
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [panel, setPanel] = useState<"canvas" | "questions" | "settings">(
    "canvas",
  );
  const [mobileCanvas, setMobileCanvas] = useState(false);
  const [live, setLive] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState("");
  const [validSettings, setValidSettings] = useState(true);
  const [comingSoon, setComingSoon] = useState<"workflow" | "connect" | null>(
    null,
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(
    null,
  );
  const [reloading, setReloading] = useState(false);
  const [picker, setPicker] = useState<"add" | "change" | null>(null);
  const [typeChange, setTypeChange] = useState<QuestionType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formSettings, setFormSettings] = useState<"design" | "ending" | null>(
    null,
  );
  const question =
    definition.questions.find((item) => item.id === selected) ??
    definition.questions[0];
  const index = definition.questions.findIndex(
    (item) => item.id === question?.id,
  );
  const version = metadata.versions.find(
    (item) => item.id === metadata.published_version_id,
  );
  const shareOnly =
    metadata.status === "published" &&
    !editor.dirty &&
    version?.source_draft_revision === editor.revision;
  const publicUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/to/${metadata.slug}`;
  function replaceQuestion(next: Question) {
    store.edit((draft) => ({
      ...draft,
      questions: draft.questions.map((item) =>
        item.id === next.id ? next : item,
      ),
    }));
  }
  function updateQuestion(
    patch: Partial<Pick<Question, "title" | "description" | "required">>,
  ) {
    if (question) replaceQuestion({ ...question, ...patch });
  }
  function select(id: string) {
    if (!validSettings) {
      setNotice(
        "Fix the unsaved number range before selecting another question.",
      );
      return;
    }
    setSelected(id);
    setPanel("canvas");
  }
  function clearPreview(id: string) {
    setAnswers((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([key]) => key !== id),
      ),
    );
  }
  function chooseType(type: QuestionType) {
    if (picker === "change" && question) {
      setPicker(null);
      if (hasIncompatibleSettings(question, type)) {
        setTypeChange(type);
        return;
      }
      replaceQuestion(makeQuestion(type, question));
      clearPreview(question.id);
      return;
    }
    const next = makeQuestion(type);
    store.edit((draft) => ({
      ...draft,
      questions: [...draft.questions, next],
    }));
    select(next.id);
    setLive(false);
    setPicker(null);
  }
  function duplicateQuestion() {
    if (!question) return;
    const next = {
      ...question,
      id: crypto.randomUUID(),
      options: question.options.map((option) => ({
        ...option,
        id: crypto.randomUUID(),
      })),
    } as Question;
    store.edit((draft) => ({
      ...draft,
      questions: [
        ...draft.questions.slice(0, index + 1),
        next,
        ...draft.questions.slice(index + 1),
      ],
    }));
    select(next.id);
  }
  function deleteQuestion() {
    if (!question) return;
    const next =
      definition.questions[index + 1] ?? definition.questions[index - 1];
    store.edit((draft) => ({
      ...draft,
      questions: draft.questions.filter((item) => item.id !== question.id),
    }));
    clearPreview(question.id);
    setSelected(next?.id ?? null);
    setDeleting(false);
    setValidSettings(true);
  }
  async function navigate(destination: string) {
    if (!validSettings) {
      setNotice("Fix the unsaved number range before leaving this form.");
      return;
    }
    try {
      await store.flush();
      router.push(destination);
    } catch {
      setPendingDestination(destination);
      setResolutionOpen(true);
    }
  }
  async function publish() {
    if (shareOnly) {
      setShareOpen(true);
      return;
    }
    setPublishing(true);
    setNotice("");
    try {
      const revision = await store.flush();
      store.adoptMetadata(await formsApi.publish(formId, revision));
      setShareOpen(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409)
        store.conflict(error);
      else if (error instanceof ApiError && error.error.details.length) {
        const first = error.error.details.find((detail) => detail.question_id);
        if (first?.question_id) select(first.question_id);
        setNotice(
          error.error.details.map((detail) => detail.message).join(" "),
        );
      } else
        setNotice(
          error instanceof Error
            ? error.message
            : "Could not publish. Please try again.",
        );
    } finally {
      setPublishing(false);
    }
  }
  function downloadDraft() {
    const blob = new Blob(
      [JSON.stringify(store.getSnapshot().draft, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${metadata.slug}-local-draft.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function discardAndReload() {
    setReloading(true);
    try {
      store.reset(await formsApi.get(formId));
      setValidSettings(true);
      setResolutionOpen(false);
      setConflictDismissed(false);
      if (pendingDestination) router.push(pendingDestination);
      setPendingDestination(null);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not reload. Your local edits are still here.",
      );
    } finally {
      setReloading(false);
    }
  }
  return (
    <main className="builder-shell" id="main-content">
      <Modal
        open={comingSoon !== null}
        onOpenChange={(open) => {
          if (!open) setComingSoon(null);
        }}
        title={
          comingSoon === "workflow"
            ? "More paths, coming soon"
            : "More connections, coming soon"
        }
        description={
          comingSoon === "workflow"
            ? "Advanced branching and logic are planned. Your form currently follows the question order you set."
            : "Integrations and webhooks are planned. Responses are available in the Results tab."
        }
      >
        <div className="dialog-actions">
          <button
            className="button button-primary"
            onClick={() => setComingSoon(null)}
          >
            Got it
          </button>
        </div>
      </Modal>
      <header className="builder-header">
        <div className="builder-breadcrumb">
          <Hint label="Back to workspace">
            <Link
              href="/workspace"
              className="icon-button"
              aria-label="Back to workspace"
              onClick={(event) => {
                event.preventDefault();
                void navigate("/workspace");
              }}
            >
              <Layers2 size={19} />
            </Link>
          </Hint>
          <ChevronRight size={14} />
          <input
            className="builder-title builder-title-input"
            aria-label="Form name"
            value={definition.title}
            maxLength={200}
            onChange={(event) =>
              store.edit((draft) => ({ ...draft, title: event.target.value }))
            }
          />
          <span className="draft-pill">
            {metadata.status === "published" ? "Published" : "Draft"}
          </span>
        </div>
        <nav className="builder-top-tabs" aria-label="Form sections">
          <span className="active">Content</span>
          <button onClick={() => setComingSoon("workflow")}>Workflow</button>
          <button onClick={() => setComingSoon("connect")}>Connect</button>
          <Link
            href={`/forms/${formId}/results`}
            onClick={(event) => {
              event.preventDefault();
              void navigate(`/forms/${formId}/results`);
            }}
          >
            Results
          </Link>
        </nav>
        <div className="builder-header-actions">
          <span className={`save-status save-${editor.status}`} role="status">
            {!validSettings
              ? "Unsaved range settings"
              : editor.status === "saved"
                ? "All changes saved"
                : editor.status === "saving"
                  ? "Saving…"
                  : editor.status === "unsaved"
                    ? "Unsaved changes"
                    : editor.status === "conflict"
                      ? "Save conflict"
                      : "Couldn’t save"}
          </span>
          {editor.status === "failed" && (
            <button
              className="button button-quiet"
              onClick={() => {
                void store.retry().catch(() => undefined);
              }}
            >
              Retry save
            </button>
          )}
          {editor.status === "conflict" && (
            <button
              className="button button-quiet"
              onClick={() => {
                setConflictDismissed(false);
                setResolutionOpen(true);
              }}
            >
              Resolve conflict
            </button>
          )}
          <Link
            href={`/forms/${formId}/preview`}
            className="button button-secondary"
            onClick={(event) => {
              event.preventDefault();
              void navigate(`/forms/${formId}/preview`);
            }}
          >
            <Play size={14} />
            Preview
          </Link>
          <button
            className="button button-primary publish-button"
            onClick={() => {
              void publish();
            }}
            disabled={
              publishing ||
              !validSettings ||
              editor.status === "conflict" ||
              editor.status === "failed"
            }
          >
            {publishing
              ? "Publishing…"
              : shareOnly
                ? "Share"
                : metadata.status === "published"
                  ? "Publish edits"
                  : "Publish"}
            <ArrowUpRight size={15} />
          </button>
          <span className="avatar avatar-small">G</span>
        </div>
      </header>
      {notice && (
        <div className="builder-notice" role="alert">
          {notice}
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <div
        className="builder-mobile-tabs"
        role="group"
        aria-label="Builder panels"
      >
        {(["questions", "canvas", "settings"] as const).map((item) => (
          <button
            key={item}
            aria-pressed={panel === item}
            className={panel === item ? "active" : ""}
            onClick={() => setPanel(item)}
          >
            {item === "canvas"
              ? "Question"
              : item === "questions"
                ? "Questions"
                : "Settings"}
          </button>
        ))}
        <Link
          href={`/forms/${formId}/results`}
          onClick={(event) => {
            event.preventDefault();
            void navigate(`/forms/${formId}/results`);
          }}
        >
          Results
        </Link>
      </div>
      <div className={`builder-body panel-${panel}`}>
        <QuestionRail
          questions={definition.questions}
          selected={question?.id}
          thankYouTitle={definition.thank_you.title}
          onSelect={select}
          onAdd={() => setPicker("add")}
          onReorder={(questions) =>
            store.edit((draft) => ({ ...draft, questions }))
          }
          onDuplicate={duplicateQuestion}
          onDelete={() => setDeleting(true)}
          onEnding={() => setFormSettings("ending")}
        />
        <section
          className="builder-canvas-region"
          aria-label="Question preview"
        >
          <div className="canvas-toolbar">
            <div className="canvas-toolbar-left">
              <div className="canvas-edit-toggle">
                <button
                  className={!live ? "active" : ""}
                  aria-label="Edit question"
                  aria-pressed={!live}
                  onClick={() => setLive(false)}
                >
                  Edit
                </button>
                <button
                  className={live ? "active" : ""}
                  aria-label="Preview question"
                  aria-pressed={live}
                  onClick={() => setLive(true)}
                >
                  Preview
                </button>
              </div>
              <span className="toolbar-divider" />
              <button
                className="button button-quiet"
                onClick={() => setFormSettings("design")}
              >
                <Palette size={16} />
                Design
              </button>
            </div>
            <div className="view-toggle">
              <button
                className={`icon-button ${!mobileCanvas ? "selected" : ""}`}
                aria-label="Desktop canvas"
                aria-pressed={!mobileCanvas}
                onClick={() => setMobileCanvas(false)}
              >
                <Monitor size={16} />
              </button>
              <button
                className={`icon-button ${mobileCanvas ? "selected" : ""}`}
                aria-label="Mobile canvas"
                aria-pressed={mobileCanvas}
                onClick={() => setMobileCanvas(true)}
              >
                <Smartphone size={16} />
              </button>
            </div>
          </div>
          <div className="canvas-scroll">
            <div
              className={`question-canvas ${mobileCanvas ? "canvas-mobile" : ""}`}
            >
              {question ? (
                <div className="canvas-question">
                  <QuestionContent
                    question={question}
                    number={index + 1}
                    value={answers[question.id]}
                    onChange={(value) =>
                      setAnswers((previous) => ({
                        ...previous,
                        [question.id]: value,
                      }))
                    }
                    titleEditor={
                      !live ? (
                        <InlineText
                          value={question.title}
                          label="Question title"
                          onChange={(title) => updateQuestion({ title })}
                        />
                      ) : undefined
                    }
                    descriptionEditor={
                      !live ? (
                        <InlineText
                          description
                          value={question.description}
                          label="Question description"
                          onChange={(description) =>
                            updateQuestion({ description })
                          }
                        />
                      ) : undefined
                    }
                  />
                  <div className="canvas-answer-footer">
                    <span
                      className="button player-button canvas-ok"
                      aria-hidden="true"
                    >
                      OK
                      <Check size={17} />
                    </span>
                    <span className="answer-hint">Answer preview</span>
                  </div>
                </div>
              ) : (
                <div className="builder-empty">
                  <span className="empty-question-icon">
                    <Plus size={25} strokeWidth={1.3} />
                  </span>
                  <h1>It starts with a good question.</h1>
                  <p>Keep it simple. Make it human.</p>
                  <button
                    className="button button-primary empty-builder-action"
                    onClick={() => setPicker("add")}
                  >
                    <Plus size={16} />
                    Add your first question
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="canvas-bottom">
            <span>
              <span className="live-dot" />
              Preview answers aren’t collected
            </span>
            <Link
              href={`/forms/${formId}/preview`}
              onClick={(event) => {
                event.preventDefault();
                void navigate(`/forms/${formId}/preview`);
              }}
            >
              Open full preview
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </section>
        <QuestionSettings
          question={question}
          onChange={replaceQuestion}
          onType={() => setPicker("change")}
          onValidity={setValidSettings}
        />
      </div>
      <QuestionPicker
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null);
        }}
        onSelect={chooseType}
        changing={picker === "change"}
      />
      <Modal
        open={typeChange !== null}
        onOpenChange={(open) => {
          if (!open) setTypeChange(null);
        }}
        title="Change how people answer?"
        description="The current draft choices or answer settings will be discarded. Your question text and historical responses will be preserved."
      >
        <div className="dialog-actions">
          <button
            className="button button-secondary"
            onClick={() => setTypeChange(null)}
          >
            Keep current type
          </button>
          <button
            className="button button-primary"
            onClick={() => {
              if (question && typeChange) {
                replaceQuestion(makeQuestion(typeChange, question));
                clearPreview(question.id);
              }
              setTypeChange(null);
              setValidSettings(true);
            }}
          >
            Change type
          </button>
        </div>
      </Modal>
      <Modal
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this question?"
        description="This removes the question from your draft. Historical responses and the current publication remain available."
      >
        <div className="dialog-actions">
          <button
            className="button button-secondary"
            onClick={() => setDeleting(false)}
          >
            Keep question
          </button>
          <button className="button button-danger" onClick={deleteQuestion}>
            Delete question
          </button>
        </div>
      </Modal>
      <Modal
        open={formSettings !== null}
        onOpenChange={(open) => {
          if (!open) setFormSettings(null);
        }}
        title={
          formSettings === "design"
            ? "Your form’s look and feel"
            : "A thoughtful ending"
        }
        description={
          formSettings === "design"
            ? "A calm, spacious canvas with one consistent accent."
            : "The message people see after their response is confirmed."
        }
      >
        {formSettings === "design" ? (
          <div className="theme-settings">
            <div className="theme-swatch" />
            <strong>Neutral</strong>
            <p>Inter typography · warm white · dark navy</p>
            <p className="settings-help">Additional themes are coming soon.</p>
            <button
              className="button button-secondary"
              onClick={() => setFormSettings("ending")}
            >
              Edit thank-you message
            </button>
          </div>
        ) : (
          <>
            <label className="field-label" htmlFor="ending-title">
              Thank-you title
            </label>
            <input
              id="ending-title"
              className="text-field"
              maxLength={200}
              value={definition.thank_you.title}
              onChange={(event) =>
                store.edit((draft) => ({
                  ...draft,
                  thank_you: { ...draft.thank_you, title: event.target.value },
                }))
              }
            />
            <label
              className="field-label ending-description-label"
              htmlFor="ending-description"
            >
              Thank-you description
            </label>
            <textarea
              id="ending-description"
              className="text-field"
              maxLength={2000}
              rows={3}
              value={definition.thank_you.description}
              onChange={(event) =>
                store.edit((draft) => ({
                  ...draft,
                  thank_you: {
                    ...draft.thank_you,
                    description: event.target.value,
                  },
                }))
              }
            />
          </>
        )}
        <div className="dialog-actions">
          <button
            className="button button-primary"
            onClick={() => setFormSettings(null)}
          >
            Done
          </button>
        </div>
      </Modal>
      <Modal
        open={
          resolutionOpen || (editor.status === "conflict" && !conflictDismissed)
        }
        onOpenChange={(open) => {
          setResolutionOpen(open);
          if (!open) {
            setConflictDismissed(true);
            setPendingDestination(null);
          }
        }}
        title={
          editor.status === "conflict"
            ? "Your form changed in another tab"
            : "Your changes haven’t been saved"
        }
        description="Your local edits are still here. Discarding and reloading will permanently lose those local edits. Download a copy first if you want to keep them."
      >
        <button className="button button-secondary" onClick={downloadDraft}>
          <Download size={16} />
          Download local draft
        </button>
        <div className="dialog-actions">
          <button
            className="button button-secondary"
            onClick={() => {
              setResolutionOpen(false);
              setConflictDismissed(true);
              setPendingDestination(null);
            }}
          >
            Keep my edits
          </button>
          <button
            className="button button-danger"
            disabled={reloading}
            onClick={() => {
              void discardAndReload();
            }}
          >
            {reloading ? "Reloading…" : "Discard local edits and reload"}
          </button>
        </div>
      </Modal>
      <Modal
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          if (!open) setCopyMessage("");
        }}
        title="Your form is ready for the world"
        description="Anyone with this link can respond. Draft edits stay private until you publish them."
      >
        <label className="field-label" htmlFor="share-link">
          Public form link
        </label>
        <input
          id="share-link"
          className="text-field"
          value={publicUrl}
          readOnly
          onFocus={(event) => event.target.select()}
        />
        <p className="copy-feedback" role="status">
          {copyMessage}
        </p>
        <div className="dialog-actions">
          <a
            className="button button-secondary"
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open form
            <ArrowUpRight size={15} />
          </a>
          <button
            className="button button-primary"
            onClick={() => {
              void navigator.clipboard
                .writeText(publicUrl)
                .then(() => setCopyMessage("Link copied"))
                .catch(() =>
                  setCopyMessage("Select the link above and copy it."),
                );
            }}
          >
            Copy link
          </button>
        </div>
      </Modal>
    </main>
  );
}
