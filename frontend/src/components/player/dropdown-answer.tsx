"use client";

import { Check, ChevronDown } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { AnswerValue, Question } from "@/lib/contracts";

export function DropdownAnswer({
  question,
  value,
  onChange,
  describedBy,
  invalid,
}: {
  question: Question;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
  describedBy?: string;
  invalid?: boolean;
}) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const previous = useRef<AnswerValue | undefined>(value);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const options = question.options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = question.options.find((option) => option.id === value);
  function choose(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
    input.current?.focus();
  }
  function show() {
    previous.current = value;
    setOpen(true);
    setSearch("");
    setActive(
      Math.max(
        0,
        question.options.findIndex((option) => option.id === value),
      ),
    );
  }
  return (
    <div className="searchable-dropdown">
      <div className="dropdown-input-row">
        <input
          ref={input}
          className="answer-input"
          role="combobox"
          aria-labelledby={`question-${question.id}`}
          aria-required={question.required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && options[active]
              ? `${listId}-${options[active].id}`
              : undefined
          }
          autoComplete="off"
          value={open ? search : (selected?.label ?? "")}
          placeholder="Search or select an option…"
          onFocus={() => {
            /* Opening is deliberate: click, typing, or an arrow key. */
          }}
          onClick={() => {
            if (!open) show();
          }}
          onChange={(event) => {
            if (!open) previous.current = value;
            setSearch(event.target.value);
            setOpen(true);
            setActive(0);
            onChange("");
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              event.stopPropagation();
              if (!open) {
                show();
                setActive(
                  event.key === "ArrowUp" ? question.options.length - 1 : 0,
                );
              } else {
                const next = Math.max(
                  0,
                  Math.min(
                    options.length - 1,
                    active + (event.key === "ArrowDown" ? 1 : -1),
                  ),
                );
                setActive(next);
                document
                  .getElementById(`${listId}-${options[next]?.id}`)
                  ?.scrollIntoView({ block: "nearest" });
              }
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              event.stopPropagation();
              if (options[active]) choose(options[active].id);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              setSearch("");
              if (previous.current !== undefined) onChange(previous.current);
            } else if (event.key === "Tab") setOpen(false);
          }}
        />
        <button
          type="button"
          className="dropdown-toggle"
          tabIndex={-1}
          aria-label="Toggle options"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            input.current?.focus();
            if (open) setOpen(false);
            else show();
          }}
        >
          <ChevronDown size={24} />
        </button>
      </div>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={`question-${question.id}`}
          className="dropdown-listbox"
        >
          {options.map((option, index) => (
            <div
              id={`${listId}-${option.id}`}
              key={option.id}
              role="option"
              aria-selected={option.id === value}
              className={`dropdown-option ${index === active ? "highlighted" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(option.id)}
            >
              <span>{option.label || "Untitled choice"}</span>
              {option.id === value && <Check size={17} />}
            </div>
          ))}
          {!options.length && (
            <div className="dropdown-no-results" role="status">
              No matching options
            </div>
          )}
        </div>
      )}
    </div>
  );
}
