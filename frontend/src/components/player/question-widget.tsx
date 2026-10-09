"use client";

import { Check } from "lucide-react";
import { useLayoutEffect, useRef, type ComponentType } from "react";
import type { AnswerValue, Question, QuestionType } from "@/lib/contracts";
import { DropdownAnswer } from "@/components/player/dropdown-answer";

type WidgetProps = {
  question: Question;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
  describedBy?: string;
  invalid?: boolean;
};
function accessibility({ question, describedBy, invalid }: WidgetProps) {
  return {
    "aria-labelledby": `question-${question.id}`,
    "aria-required": question.required,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
  };
}
function TextAnswer(props: WidgetProps) {
  const { question, value, onChange } = props;
  return (
    <input
      id={`answer-${question.id}`}
      className="answer-input"
      {...accessibility(props)}
      type={question.type === "email" ? "email" : "text"}
      inputMode={
        question.type === "number"
          ? "decimal"
          : question.type === "email"
            ? "email"
            : "text"
      }
      autoComplete={question.type === "email" ? "email" : "off"}
      placeholder={
        question.type === "email"
          ? "name@example.com"
          : "Type your answer here…"
      }
      value={
        typeof value === "string" || typeof value === "number" ? value : ""
      }
      maxLength={10000}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
function LongAnswer(props: WidgetProps) {
  const { question, value, onChange } = props;
  return (
    <textarea
      id={`answer-${question.id}`}
      className="answer-input answer-textarea"
      {...accessibility(props)}
      placeholder="Tell us a little more…"
      rows={3}
      maxLength={10000}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
function radioNavigation(
  event: React.KeyboardEvent,
  values: AnswerValue[],
  value: AnswerValue | undefined,
  onChange: (value: AnswerValue) => void,
) {
  if (
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(event.key)
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  const current = values.findIndex((item) => item === value);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? values.length - 1
        : (Math.max(0, current) +
            (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) +
            values.length) %
          values.length;
  onChange(values[next]);
  event.currentTarget
    .querySelectorAll<HTMLButtonElement>("[role=radio]")
    [next]?.focus();
}
function ChoiceAnswer(props: WidgetProps) {
  const { question, value, onChange } = props;
  const choices =
    question.type === "yes_no"
      ? [
          { id: true, label: "Yes" },
          { id: false, label: "No" },
        ]
      : question.options;
  const selected = choices.findIndex((option) => option.id === value);
  return (
    <div
      className="choice-group"
      role="radiogroup"
      {...accessibility(props)}
      onKeyDown={(event) =>
        radioNavigation(
          event,
          choices.map((option) => option.id),
          value,
          onChange,
        )
      }
    >
      {choices.map((option, index) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === option.id}
          tabIndex={index === (selected >= 0 ? selected : 0) ? 0 : -1}
          className={`choice-row ${value === option.id ? "is-selected" : ""}`}
          key={String(option.id)}
          onClick={() => onChange(option.id)}
        >
          <span className="choice-key" aria-hidden="true">
            {index < 26 ? String.fromCharCode(65 + index) : index + 1}
          </span>
          <span>{option.label || "Untitled choice"}</span>
          {value === option.id && (
            <Check size={18} className="choice-check" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  );
}
function RatingAnswer(props: WidgetProps) {
  const { question, value, onChange } = props;
  if (question.type !== "rating") return null;
  const values = Array.from(
    { length: question.settings.scale },
    (_, i) => i + 1,
  );
  return (
    <div
      className="rating-group"
      role="radiogroup"
      {...accessibility(props)}
      onKeyDown={(event) => radioNavigation(event, values, value, onChange)}
    >
      {values.map((rating, index) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === rating}
          tabIndex={
            value === rating ||
            (!values.some((item) => item === value) && index === 0)
              ? 0
              : -1
          }
          className={`rating-option ${value === rating ? "is-selected" : ""}`}
          key={rating}
          aria-label={`${rating} out of ${question.settings.scale}`}
          onClick={() => onChange(rating)}
        >
          {rating}
        </button>
      ))}
    </div>
  );
}

/** Preview and public flows render through this single exhaustive type registry. */
export const questionRenderers: Record<
  QuestionType,
  ComponentType<WidgetProps>
> = {
  short_text: TextAnswer,
  long_text: LongAnswer,
  multiple_choice: ChoiceAnswer,
  dropdown: DropdownAnswer,
  email: TextAnswer,
  number: TextAnswer,
  yes_no: ChoiceAnswer,
  rating: RatingAnswer,
};
export function QuestionWidget(props: WidgetProps) {
  const Renderer = questionRenderers[props.question.type];
  return <Renderer {...props} />;
}

export function QuestionContent({
  question,
  number,
  value,
  onChange,
  titleEditor,
  descriptionEditor,
  error,
  focusOnMount = false,
}: WidgetProps & {
  number: number;
  titleEditor?: React.ReactNode;
  descriptionEditor?: React.ReactNode;
  error?: string | null;
  focusOnMount?: boolean;
}) {
  const body = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    if (focusOnMount) {
      if (error)
        body.current
          ?.querySelector<HTMLElement>(
            ".answer-input, [role=radio][tabindex='0']",
          )
          ?.focus({ preventScroll: true });
      else if (!mounted.current)
        body.current
          ?.querySelector<HTMLElement>("h1")
          ?.focus({ preventScroll: true });
    }
    mounted.current = true;
  }, [question.id, error, focusOnMount]);
  const descriptionId = `description-${question.id}`,
    errorId = `error-${question.id}`;
  const describedBy =
    [question.description ? descriptionId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="question-content" ref={body}>
      <span className="question-number" aria-hidden="true">
        {number}
        <span>→</span>
      </span>
      <div className="question-body">
        <h1
          id={`question-${question.id}`}
          tabIndex={focusOnMount ? -1 : undefined}
        >
          {titleEditor ?? (question.title || "Your question goes here")}
          {question.required && (
            <span className="required-mark" aria-label="required">
              *
            </span>
          )}
        </h1>
        {descriptionEditor ??
          (question.description && (
            <p className="question-description" id={descriptionId}>
              {question.description}
            </p>
          ))}
        <div className="answer-area">
          <QuestionWidget
            question={question}
            value={value}
            onChange={onChange}
            describedBy={describedBy}
            invalid={Boolean(error)}
          />
          {!question.required && value !== undefined && value !== "" && (
            <button
              className="clear-answer"
              type="button"
              onClick={() => onChange("")}
            >
              Clear answer
            </button>
          )}
        </div>
        {error && (
          <p id={errorId} className="player-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
