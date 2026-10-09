"use client";

import { useLayoutEffect, useRef } from "react";

export function InlineText({
  value,
  onChange,
  label,
  description = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: boolean;
}) {
  const element = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (element.current) {
      element.current.style.height = "auto";
      element.current.style.height = `${element.current.scrollHeight}px`;
    }
  }, [value]);
  const input = (
    <textarea
      ref={element}
      className={description ? "inline-description" : "inline-question-title"}
      aria-label={label}
      placeholder={
        description ? "Description (optional)" : "Your question goes here"
      }
      value={value}
      rows={1}
      maxLength={description ? 2000 : 500}
      onChange={(event) => onChange(event.target.value)}
    />
  );
  if (description) return input;
  return (
    <span className="inline-title-editor">
      <span className="inline-title-mirror" aria-hidden="true">
        {value || "Your question goes here"}
      </span>
      {input}
    </span>
  );
}
