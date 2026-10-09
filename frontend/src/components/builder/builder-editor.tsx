"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Switch from "@radix-ui/react-switch";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  GripVertical,
  Layers2,
  Monitor,
  Palette,
  Play,
  Plus,
  Settings2,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { ApiError, formsApi } from "@/lib/api/client";
import type { Answers, FormDetail, Question } from "@/lib/contracts";
import { questionTypes } from "@/lib/question-types";
import { useDraftEditor } from "@/hooks/use-draft-editor";
import { InlineText } from "@/components/builder/inline-text";
import { QuestionContent } from "@/components/player/question-widget";
import { Modal } from "@/components/ui/modal";
import { Hint } from "@/components/ui/tooltip";

export function TypeBadge({ question }: { question: Question }) {
  const { icon: Icon, color } = questionTypes[question.type];
  return (
    <span className={`type-badge type-${color}`}>
      <Icon size={15} />
    </span>
  );
}

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
  const [shareOpen, setShareOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(
    null,
  );
  const [reloading, setReloading] = useState(false);
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

  function updateQuestion(
    patch: Partial<Pick<Question, "title" | "description" | "required">>,
  ) {
    if (question)
      store.edit((draft) => ({
        ...draft,
        questions: draft.questions.map((item) =>
          item.id === question.id ? { ...item, ...patch } : item,
        ),
      }));
  }
  function addTextQuestion() {
    const id = crypto.randomUUID();
    const next: Question = {
      id,
      type: "short_text",
      title: "",
      description: "",
      required: false,
      settings: {},
      options: [],
    };
    store.edit((draft) => ({
      ...draft,
      questions: [...draft.questions, next],
    }));
    setSelected(id);
    setLive(false);
    setPanel("canvas");
  }
  async function navigate(destination: string) {
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
      if (error instanceof ApiError && error.error.details.length) {
        const first = error.error.details.find((detail) => detail.question_id);
        if (first?.question_id) setSelected(first.question_id);
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
          <button disabled>Workflow</button>
          <button disabled>Connect</button>
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
            {editor.status === "saved"
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
            className="button button-primary"
            onClick={() => {
              void publish();
            }}
            disabled={
              publishing ||
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
      </div>
      <div className={`builder-body panel-${panel}`}>
        <aside className="question-rail" aria-label="Questions">
          <div className="rail-header">
            <strong>Content</strong>
            <span>{definition.questions.length}</span>
          </div>
          <button
            className="button button-secondary add-question"
            onClick={addTextQuestion}
            disabled={definition.questions.length >= 100}
          >
            <Plus size={16} />
            Add question
          </button>
          <div className="question-list">
            {definition.questions.map((item, itemIndex) => (
              <button
                key={item.id}
                className={`question-list-item ${question?.id === item.id ? "active" : ""}`}
                aria-pressed={question?.id === item.id}
                onClick={() => {
                  setSelected(item.id);
                  setPanel("canvas");
                }}
              >
                <GripVertical size={13} className="drag-placeholder" />
                <TypeBadge question={item} />
                <span className="question-list-number">{itemIndex + 1}</span>
                <span className="question-list-title">
                  {item.title || "Untitled question"}
                </span>
                {item.required && <span className="list-required">*</span>}
              </button>
            ))}
            {!definition.questions.length && (
              <p className="rail-empty">Your questions will appear here.</p>
            )}
          </div>
          <div className="endings-section">
            <div className="rail-header">
              <strong>Ending</strong>
            </div>
            <div className="ending-item">
              <span className="type-badge type-ending">
                <Check size={15} />
              </span>
              <span>{definition.thank_you.title}</span>
            </div>
          </div>
          <div className="rail-footnote">
            <span className="live-dot" />
            Changes stay in your draft until published.
          </div>
        </aside>
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
              <button className="button button-quiet" disabled>
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
                    onClick={addTextQuestion}
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
        <aside className="question-settings" aria-label="Question settings">
          <div className="settings-heading">
            <Settings2 size={17} />
            <strong>Question settings</strong>
          </div>
          {question ? (
            <>
              <div className="settings-section">
                <div className="field-label">Question type</div>
                <div className="type-selector">
                  <TypeBadge question={question} />
                  <span>{questionTypes[question.type].label}</span>
                  <ChevronDown size={15} />
                </div>
              </div>
              <div className="settings-section">
                <div className="setting-row">
                  <label htmlFor="required-toggle">Required</label>
                  <Switch.Root
                    id="required-toggle"
                    className="switch"
                    checked={question.required}
                    onCheckedChange={(required) => updateQuestion({ required })}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </div>
                <p className="settings-help">
                  An answer is needed to continue.
                </p>
              </div>
              {(question.type === "multiple_choice" ||
                question.type === "dropdown") && (
                <div className="settings-section">
                  <div className="field-label">
                    Choices
                    <span className="muted">{question.options.length}</span>
                  </div>
                  <div className="settings-options">
                    {question.options.map((option, optionIndex) => (
                      <div className="settings-option" key={option.id}>
                        <span>{String.fromCharCode(65 + optionIndex)}</span>
                        <span>{option.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {question.type === "rating" && (
                <div className="settings-section">
                  <div className="field-label">Rating scale</div>
                  <div className="text-field">
                    1 to {question.settings.scale}
                  </div>
                </div>
              )}
              <div className="settings-section">
                <div className="field-label">Description</div>
                <p className="settings-description">
                  {question.description || "No description added."}
                </p>
              </div>
            </>
          ) : (
            <p className="settings-empty">
              Select a question to see its settings.
            </p>
          )}
          <div className="settings-tip">
            <strong>A little guidance goes a long way.</strong>
            <p>
              Use a description to add context and help people give their best
              answer.
            </p>
          </div>
        </aside>
      </div>
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
