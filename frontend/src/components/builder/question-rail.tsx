"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import type { Question } from "@/lib/contracts";
import { useState } from "react";
import { TypeBadge } from "@/components/builder/type-badge";

function SortableQuestion({
  question,
  index,
  selected,
  target,
  onSelect,
}: {
  question: Question;
  index: number;
  selected: boolean;
  target: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`sortable-question ${selected ? "active" : ""} ${isDragging ? "dragging" : ""} ${target ? "drop-target" : ""}`}
    >
      <button
        className="question-drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Reorder question ${index + 1}`}
      >
        <GripVertical size={14} />
      </button>
      <button
        className="question-list-item"
        aria-pressed={selected}
        onClick={onSelect}
      >
        <TypeBadge type={question.type} />
        <span className="question-list-number">{index + 1}</span>
        <span className="question-list-title">
          {question.title || "Untitled question"}
        </span>
        {question.required && <span className="list-required">*</span>}
      </button>
    </div>
  );
}
export function QuestionRail({
  questions,
  selected,
  thankYouTitle,
  onSelect,
  onAdd,
  onReorder,
  onDuplicate,
  onDelete,
  onEnding,
}: {
  questions: Question[];
  selected?: string;
  thankYouTitle: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onReorder: (questions: Question[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEnding: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const index = questions.findIndex((q) => q.id === selected);
  const [dragged, setDragged] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const activeQuestion = questions.find((q) => q.id === dragged);
  function moved(event: DragEndEvent) {
    setDragged(null);
    setTarget(null);
    const { active, over } = event;
    if (over && active.id !== over.id)
      onReorder(
        arrayMove(
          questions,
          questions.findIndex((q) => q.id === active.id),
          questions.findIndex((q) => q.id === over.id),
        ),
      );
  }
  return (
    <aside className="question-rail" aria-label="Questions">
      <div className="rail-header">
        <strong>Content</strong>
        <span>{questions.length}</span>
      </div>
      <button
        className="button button-secondary add-question"
        onClick={onAdd}
        disabled={questions.length >= 100}
      >
        <Plus size={16} />
        Add question
      </button>
      <div className="question-list" data-drop-target={target}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={moved}
          onDragStart={(event) => setDragged(String(event.active.id))}
          onDragOver={(event) =>
            setTarget(event.over ? String(event.over.id) : null)
          }
          onDragCancel={() => {
            setDragged(null);
            setTarget(null);
          }}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                "Press Space to pick up a question, Up or Down to reorder, Space to drop, or Escape to cancel.",
            },
          }}
        >
          <SortableContext
            items={questions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            {questions.map((q, i) => (
              <SortableQuestion
                key={q.id}
                question={q}
                index={i}
                selected={q.id === selected}
                target={q.id === target && q.id !== dragged}
                onSelect={() => onSelect(q.id)}
              />
            ))}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeQuestion && (
              <div className="question-drag-overlay">
                <GripVertical size={14} />
                <TypeBadge type={activeQuestion.type} />
                <span>{activeQuestion.title || "Untitled question"}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
        {!questions.length && (
          <p className="rail-empty">Your questions will appear here.</p>
        )}
      </div>
      {index >= 0 && (
        <div className="question-rail-actions">
          <button
            className="icon-button"
            aria-label="Move question up"
            disabled={index === 0}
            onClick={() => onReorder(arrayMove(questions, index, index - 1))}
          >
            <ArrowUp size={15} />
          </button>
          <button
            className="icon-button"
            aria-label="Move question down"
            disabled={index === questions.length - 1}
            onClick={() => onReorder(arrayMove(questions, index, index + 1))}
          >
            <ArrowDown size={15} />
          </button>
          <button
            className="icon-button"
            aria-label="Duplicate question"
            disabled={questions.length >= 100}
            onClick={onDuplicate}
          >
            <Copy size={15} />
          </button>
          <button
            className="icon-button destructive-text"
            aria-label="Delete question"
            onClick={onDelete}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
      <div className="endings-section">
        <div className="rail-header">
          <strong>Ending</strong>
        </div>
        <button className="ending-item" onClick={onEnding}>
          <span className="type-badge type-ending">
            <Check size={15} />
          </span>
          <span>{thankYouTitle}</span>
        </button>
      </div>
      <div className="rail-footnote">
        <span className="live-dot" />
        Changes stay in your draft until published.
      </div>
    </aside>
  );
}
