"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import * as Switch from "@radix-ui/react-switch";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
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
import { formsApi } from "@/lib/api/client";
import type { Answers, Question } from "@/lib/contracts";
import { questionTypes } from "@/lib/question-types";
import { QuestionContent } from "@/components/player/question-widget";
import { ErrorState, LoadingState } from "@/components/ui/query-state";
import { Hint } from "@/components/ui/tooltip";

function TypeBadge({ question }: { question: Question }) {
  const { icon: Icon, color } = questionTypes[question.type];
  return (
    <span className={`type-badge type-${color}`}>
      <Icon size={15} />
    </span>
  );
}

export function Builder({ formId }: { formId: string }) {
  const form = useQuery({
    queryKey: ["form", formId],
    queryFn: () => formsApi.get(formId),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [panel, setPanel] = useState<"canvas" | "questions" | "settings">(
    "canvas",
  );
  const [mobileCanvas, setMobileCanvas] = useState(false);
  if (form.isPending)
    return (
      <main className="full-height" id="main-content">
        <LoadingState label="Opening your form" />
      </main>
    );
  if (form.isError)
    return (
      <main className="full-height" id="main-content">
        <Link href="/workspace" className="button button-quiet">
          <ArrowLeft size={17} />
          Workspace
        </Link>
        <ErrorState
          message={form.error.message}
          onRetry={() => {
            void form.refetch();
          }}
        />
      </main>
    );
  const definition = form.data;
  const question =
    definition.questions.find((item) => item.id === selected) ??
    definition.questions[0];
  const index = definition.questions.findIndex(
    (item) => item.id === question?.id,
  );

  return (
    <main className="builder-shell" id="main-content">
      <header className="builder-header">
        <div className="builder-breadcrumb">
          <Hint label="Back to workspace">
            <Link
              href="/workspace"
              className="icon-button"
              aria-label="Back to workspace"
            >
              <Layers2 size={19} />
            </Link>
          </Hint>
          <ChevronRight size={14} />
          <span className="builder-title">{definition.title}</span>
          <span className="draft-pill">Draft</span>
        </div>
        <nav className="builder-top-tabs" aria-label="Form sections">
          <span className="active">Content</span>
          <button disabled>Workflow</button>
          <button disabled>Connect</button>
          <button disabled>Results</button>
        </nav>
        <div className="builder-header-actions">
          <Link
            href={`/forms/${formId}/preview`}
            className="button button-secondary"
          >
            <Play size={14} />
            Preview
          </Link>
          <button className="button button-primary" disabled>
            Publish
            <ArrowUpRight size={15} />
          </button>
          <span className="avatar avatar-small">G</span>
        </div>
      </header>
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
          <button className="button button-secondary add-question" disabled>
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
              <span className="canvas-mode">Question preview</span>
              <span className="toolbar-divider" />
              <button className="button button-quiet" disabled>
                <Palette size={16} />
                Design
              </button>
            </div>
            <div className="canvas-toolbar-right">
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
                </div>
              )}
            </div>
          </div>
          <div className="canvas-bottom">
            <span>
              <span className="live-dot" />
              Preview answers aren’t collected
            </span>
            <Link href={`/forms/${formId}/preview`}>
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
                <label className="field-label" htmlFor="question-type">
                  Question type
                </label>
                <div className="type-selector" id="question-type">
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
                    disabled
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
                  <button className="button button-quiet" disabled>
                    <Plus size={14} />
                    Add choice
                  </button>
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
    </main>
  );
}
