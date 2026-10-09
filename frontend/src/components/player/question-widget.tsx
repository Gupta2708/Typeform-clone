"use client";

import { Check, ChevronDown } from "lucide-react";
import type { AnswerValue, Question } from "@/lib/contracts";

export function QuestionWidget({
  question,
  value,
  onChange,
}: {
  question: Question;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
}) {
  const inputId = `answer-${question.id}`;
  const titleId = `question-${question.id}`;
  switch (question.type) {
    case "short_text":
    case "email":
    case "number":
      return (
        <input
          id={inputId}
          className="answer-input"
          aria-labelledby={titleId}
          aria-required={question.required}
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
          maxLength={10_000}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "long_text":
      return (
        <textarea
          id={inputId}
          className="answer-input answer-textarea"
          aria-labelledby={titleId}
          aria-required={question.required}
          placeholder="Tell us a little more…"
          rows={3}
          maxLength={10_000}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "multiple_choice":
    case "yes_no": {
      const choices =
        question.type === "yes_no"
          ? [
              { id: true, label: "Yes" },
              { id: false, label: "No" },
            ]
          : question.options;
      return (
        <div className="choice-group" role="group" aria-labelledby={titleId}>
          {choices.map((option, index) => (
            <button
              type="button"
              className={`choice-row ${value === option.id ? "is-selected" : ""}`}
              key={String(option.id)}
              aria-pressed={value === option.id}
              onClick={() => onChange(option.id)}
            >
              <span className="choice-key" aria-hidden="true">
                {index < 26 ? String.fromCharCode(65 + index) : index + 1}
              </span>
              <span>{option.label || "Untitled choice"}</span>
              {value === option.id && (
                <Check size={18} className="choice-check" />
              )}
            </button>
          ))}
        </div>
      );
    }
    case "dropdown":
      return (
        <div className="dropdown-answer">
          <select
            id={inputId}
            aria-labelledby={titleId}
            aria-required={question.required}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="" disabled>
              Select an option
            </option>
            {question.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={24} aria-hidden="true" />
        </div>
      );
    case "rating":
      return (
        <div className="rating-group" role="group" aria-labelledby={titleId}>
          {Array.from(
            { length: question.settings.scale },
            (_, index) => index + 1,
          ).map((rating) => (
            <button
              type="button"
              key={rating}
              className={`rating-option ${value === rating ? "is-selected" : ""}`}
              aria-label={`${rating} out of ${question.settings.scale}`}
              aria-pressed={value === rating}
              onClick={() => onChange(rating)}
            >
              {rating}
            </button>
          ))}
        </div>
      );
  }
}

export function QuestionContent({
  question,
  number,
  value,
  onChange,
}: {
  question: Question;
  number: number;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
}) {
  return (
    <div className="question-content">
      <span className="question-number" aria-hidden="true">
        {number}
        <span>→</span>
      </span>
      <div className="question-body">
        <h1 id={`question-${question.id}`}>
          {question.title || "Your question goes here"}
          {question.required && (
            <span className="required-mark" aria-label="required">
              *
            </span>
          )}
        </h1>
        {question.description && (
          <p className="question-description">{question.description}</p>
        )}
        <div className="answer-area">
          <QuestionWidget
            question={question}
            value={value}
            onChange={onChange}
          />
        </div>
      </div>
    </div>
  );
}
