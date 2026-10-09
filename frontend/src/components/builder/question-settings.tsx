"use client";

import * as Switch from "@radix-ui/react-switch";
import { ChevronDown, Plus, Settings2, X } from "lucide-react";
import { useState } from "react";
import type { Question } from "@/lib/contracts";
import { questionTypes } from "@/lib/question-types";
import { TypeBadge } from "@/components/builder/type-badge";

function NumberBounds({
  question,
  onChange,
  onValidity,
}: {
  question: Extract<Question, { type: "number" }>;
  onChange: (question: Question) => void;
  onValidity: (valid: boolean) => void;
}) {
  const [bounds, setBounds] = useState({
    min: question.settings.min?.toString() ?? "",
    max: question.settings.max?.toString() ?? "",
  });
  const min = bounds.min.trim() === "" ? null : Number(bounds.min),
    max = bounds.max.trim() === "" ? null : Number(bounds.max);
  const valid =
    (min === null || Number.isFinite(min)) &&
    (max === null || Number.isFinite(max)) &&
    (min === null || max === null || min <= max);
  const isDecimal = (value: string) =>
    value.trim() === "" ||
    /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim());
  function change(key: "min" | "max", value: string) {
    const next = { ...bounds, [key]: value };
    setBounds(next);
    const lower = next.min.trim() === "" ? null : Number(next.min),
      upper = next.max.trim() === "" ? null : Number(next.max);
    const nextValid =
      isDecimal(next.min) &&
      isDecimal(next.max) &&
      (lower === null || Number.isFinite(lower)) &&
      (upper === null || Number.isFinite(upper)) &&
      (lower === null || upper === null || lower <= upper);
    onValidity(nextValid);
    if (nextValid)
      onChange({ ...question, settings: { min: lower, max: upper } });
  }
  return (
    <div className="settings-section">
      <div className="field-label">Answer range</div>
      <div className="number-bounds">
        {(["min", "max"] as const).map((key) => (
          <label key={key}>
            <span>{key === "min" ? "Minimum" : "Maximum"}</span>
            <input
              className="text-field"
              inputMode="decimal"
              value={bounds[key]}
              aria-label={`${key === "min" ? "Minimum" : "Maximum"} value`}
              onChange={(event) => change(key, event.target.value)}
            />
          </label>
        ))}
      </div>
      {(!valid || !isDecimal(bounds.min) || !isDecimal(bounds.max)) && (
        <p className="field-error">
          Enter finite numbers with minimum no greater than maximum. These range
          edits are not saved yet.
        </p>
      )}
      <p className="settings-help">Leave either blank for no limit.</p>
    </div>
  );
}
export function QuestionSettings({
  question,
  onChange,
  onType,
  onValidity,
}: {
  question?: Question;
  onChange: (question: Question) => void;
  onType: () => void;
  onValidity: (valid: boolean) => void;
}) {
  return (
    <aside className="question-settings" aria-label="Question settings">
      <div className="settings-heading">
        <Settings2 size={17} />
        <strong>Question settings</strong>
      </div>
      {question ? (
        <>
          <div className="settings-section">
            <div className="field-label">Question type</div>
            <button className="type-selector" onClick={onType}>
              <TypeBadge type={question.type} />
              <span>{questionTypes[question.type].label}</span>
              <ChevronDown size={15} />
            </button>
          </div>
          <div className="settings-section">
            <div className="setting-row">
              <label htmlFor="required-toggle">Required</label>
              <Switch.Root
                id="required-toggle"
                className="switch"
                checked={question.required}
                onCheckedChange={(required) =>
                  onChange({ ...question, required })
                }
              >
                <Switch.Thumb className="switch-thumb" />
              </Switch.Root>
            </div>
            <p className="settings-help">An answer is needed to continue.</p>
          </div>
          {(question.type === "multiple_choice" ||
            question.type === "dropdown") && (
            <div className="settings-section">
              <div className="field-label">
                Choices<span className="muted">{question.options.length}</span>
              </div>
              <div className="settings-options">
                {question.options.map((option, i) => (
                  <div className="settings-option" key={option.id}>
                    <span>{i < 26 ? String.fromCharCode(65 + i) : i + 1}</span>
                    <input
                      aria-label={`Choice ${i + 1}`}
                      value={option.label}
                      maxLength={500}
                      placeholder="Choice label"
                      onChange={(event) =>
                        onChange({
                          ...question,
                          options: question.options.map((item) =>
                            item.id === option.id
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                    <button
                      className="icon-button"
                      aria-label={`Remove choice ${i + 1}`}
                      onClick={() =>
                        onChange({
                          ...question,
                          options: question.options.filter(
                            (item) => item.id !== option.id,
                          ),
                        })
                      }
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="button button-quiet settings-add-choice"
                disabled={question.options.length >= 100}
                onClick={() =>
                  onChange({
                    ...question,
                    options: [
                      ...question.options,
                      { id: crypto.randomUUID(), label: "" },
                    ],
                  })
                }
              >
                <Plus size={14} />
                Add choice
              </button>
              <p className="settings-help">
                At least two labelled choices are needed to publish. Respondents
                select one answer.
              </p>
            </div>
          )}
          {question.type === "rating" && (
            <div className="settings-section">
              <label className="field-label" htmlFor="rating-scale">
                Rating scale
              </label>
              <select
                id="rating-scale"
                className="text-field"
                value={question.settings.scale}
                onChange={(event) =>
                  onChange({
                    ...question,
                    settings: { scale: Number(event.target.value) },
                  })
                }
              >
                {Array.from({ length: 9 }, (_, i) => i + 2).map((scale) => (
                  <option key={scale} value={scale}>
                    1 to {scale}
                  </option>
                ))}
              </select>
            </div>
          )}
          {question.type === "number" && (
            <NumberBounds
              key={question.id}
              question={question}
              onChange={onChange}
              onValidity={onValidity}
            />
          )}
          <div className="settings-section">
            <label className="field-label" htmlFor="question-description">
              Description
            </label>
            <textarea
              id="question-description"
              className="text-field settings-description-input"
              rows={3}
              maxLength={2000}
              placeholder="Add a little context…"
              value={question.description}
              onChange={(event) =>
                onChange({ ...question, description: event.target.value })
              }
            />
          </div>
        </>
      ) : (
        <p className="settings-empty">Select a question to see its settings.</p>
      )}
      <div className="settings-tip">
        <strong>A little guidance goes a long way.</strong>
        <p>
          Use a description to add context and help people give their best
          answer.
        </p>
      </div>
    </aside>
  );
}
