"use client";
import { Search } from "lucide-react";
import { useState } from "react";
import { QUESTION_TYPES, type QuestionType } from "@/lib/contracts";
import { questionTypes } from "@/lib/question-types";
import { TypeBadge } from "@/components/builder/type-badge";
import { Modal } from "@/components/ui/modal";
const descriptions: Record<QuestionType, string> = {
  short_text: "A name, a thought, a few words",
  long_text: "Make room for a little more",
  multiple_choice: "Let people pick one answer",
  dropdown: "A searchable list of options",
  email: "An email address to stay in touch",
  number: "Numbers, quantities, and amounts",
  yes_no: "A simple yes or no",
  rating: "A feeling, on a numbered scale",
};
export function QuestionPicker({
  open,
  onOpenChange,
  onSelect,
  changing = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: QuestionType) => void;
  changing?: boolean;
}) {
  const [search, setSearch] = useState("");
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSearch("");
      }}
      title={changing ? "Change question type" : "What would you like to ask?"}
      description="Choose the best way for people to answer."
    >
      <label className="picker-search">
        <Search size={17} />
        <input
          aria-label="Search question types"
          placeholder="Search question types"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="question-picker-grid">
        {QUESTION_TYPES.filter((type) =>
          questionTypes[type].label
            .toLowerCase()
            .includes(search.toLowerCase()),
        ).map((type) => (
          <button
            className="picker-option"
            key={type}
            onClick={() => onSelect(type)}
          >
            <TypeBadge type={type} />
            <span>
              <strong>{questionTypes[type].label}</strong>
              <small>{descriptions[type]}</small>
            </span>
          </button>
        ))}
      </div>
      {!QUESTION_TYPES.some((type) =>
        questionTypes[type].label.toLowerCase().includes(search.toLowerCase()),
      ) && <p className="picker-empty">No question types found.</p>}
    </Modal>
  );
}
