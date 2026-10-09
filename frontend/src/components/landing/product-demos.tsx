"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  GripVertical,
  Layers2,
  List,
  Plus,
  Star,
  Type,
} from "lucide-react";
import { useState } from "react";
import { FormPlayer } from "@/components/player/form-player";
import type { FormDefinition } from "@/lib/contracts";

const preview: FormDefinition = {
  title: "A little hello",
  theme: { key: "neutral" },
  thank_you: {
    title: "Thanks for stopping by.",
    description: "That was a preview. No response was recorded.",
  },
  questions: [
    {
      id: "90000000-0000-4000-8000-000000000001",
      type: "short_text",
      title: "First things first, what’s your name?",
      description: "We’re happy you’re here.",
      required: false,
      settings: {},
      options: [],
    },
    {
      id: "90000000-0000-4000-8000-000000000002",
      type: "multiple_choice",
      title: "What made the biggest difference?",
      description: "Sometimes, it’s the little things.",
      required: false,
      settings: {},
      options: [
        {
          id: "90000000-0000-4000-8000-000000000011",
          label: "Thoughtful design",
        },
        { id: "90000000-0000-4000-8000-000000000012", label: "Helpful people" },
      ],
    },
    {
      id: "90000000-0000-4000-8000-000000000003",
      type: "rating",
      title: "How did we make you feel?",
      description: "A little feedback goes a long way.",
      required: false,
      settings: { scale: 5 },
      options: [],
    },
  ],
};

export function PlayerDemo() {
  return (
    <div className="landing-demo-player">
      <div className="product-demo-label">
        <span>
          <i />
          Try a little conversation
        </span>
        <span>Preview only</span>
      </div>
      <FormPlayer definition={preview} mode="preview" autoFocus={false} />
    </div>
  );
}

export function BuilderDemo() {
  const [questions, setQuestions] = useState([
    { id: 1, title: "First things first, your name?" },
    { id: 2, title: "What made your day?" },
    { id: 3, title: "How did we do?" },
  ]);
  const [selected, setSelected] = useState(2);
  const [choices, setChoices] = useState([
    "Thoughtful design",
    "Helpful people",
  ]);
  const question = questions.find((item) => item.id === selected)!;
  const index = questions.findIndex((item) => item.id === selected);
  function reorder(direction: number) {
    const next = [...questions];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    setQuestions(next);
  }
  return (
    <div className="landing-builder-demo">
      <div className="product-demo-header">
        <Layers2 size={19} />
        <span>A little feedback</span>
        <span className="demo-local-pill">Interactive preview</span>
      </div>
      <div className="demo-builder-grid">
        <div className="demo-builder-rail">
          <span className="demo-small-label">CONTENT</span>
          <button
            className="demo-add"
            disabled={questions.length === 4}
            onClick={() => {
              setQuestions([
                ...questions,
                { id: 4, title: "Anything else on your mind?" },
              ]);
              setSelected(4);
            }}
          >
            <Plus size={13} />
            Add question
          </button>
          {questions.map((item, i) => (
            <button
              className={`demo-rail-question ${item.id === selected ? "active" : ""}`}
              key={item.id}
              onClick={() => setSelected(item.id)}
            >
              <GripVertical size={12} />
              <span className="mini-type">
                {item.id === 2 ? (
                  <List size={13} />
                ) : item.id === 3 ? (
                  <Star size={13} />
                ) : (
                  <Type size={13} />
                )}
              </span>
              <small>{i + 1}</small>
              <span>{item.title}</span>
            </button>
          ))}
          <div className="demo-reorder">
            <button
              disabled={index === 0}
              aria-label="Move demonstration question up"
              onClick={() => reorder(-1)}
            >
              <ArrowUp size={15} />
            </button>
            <button
              disabled={index === questions.length - 1}
              aria-label="Move demonstration question down"
              onClick={() => reorder(1)}
            >
              <ArrowDown size={15} />
            </button>
          </div>
        </div>
        <div className="demo-builder-canvas">
          <span className="demo-canvas-number">{index + 1} →</span>
          <label className="sr-only" htmlFor="demo-edit-title">
            Edit demonstration question
          </label>
          <textarea
            id="demo-edit-title"
            value={question.title}
            rows={2}
            maxLength={100}
            onChange={(event) =>
              setQuestions(
                questions.map((item) =>
                  item.id === selected
                    ? { ...item, title: event.target.value }
                    : item,
                ),
              )
            }
          />
          <p>A little space for a thoughtful answer.</p>
          {question.id === 2 ? (
            <div className="demo-editable-choices">
              {choices.map((value, i) => (
                <label key={i}>
                  <span>{String.fromCharCode(65 + i)}</span>
                  <input
                    aria-label={`Demonstration choice ${i + 1}`}
                    value={value}
                    maxLength={80}
                    onChange={(event) =>
                      setChoices(
                        choices.map((choice, j) =>
                          j === i ? event.target.value : choice,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </div>
          ) : question.id === 3 ? (
            <div className="demo-builder-rating" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star size={23} key={i} />
              ))}
            </div>
          ) : (
            <div className="demo-builder-underline" aria-hidden="true">
              Type your answer here…
            </div>
          )}
          <span className="demo-builder-ok" aria-hidden="true">
            OK <Check size={13} />
          </span>
        </div>
      </div>
      <div className="product-demo-footer">
        <span>
          <i />
          Try editing a question.
        </span>
        <span>Local changes only</span>
      </div>
    </div>
  );
}

const illustrativeResponses = [
  { name: "Avery", choice: "Thoughtful design", rating: 5 },
  { name: "Maya", choice: "Helpful people", rating: 4 },
  { name: "Sam", choice: "Thoughtful design", rating: 5 },
];
export function ResultsDemo() {
  const [selected, setSelected] = useState(0);
  const answer = illustrativeResponses[selected];
  return (
    <div className="landing-results-demo">
      <div className="product-demo-header">
        <Layers2 size={19} />
        <span>A little feedback</span>
        <span className="demo-local-pill">Illustrative data</span>
      </div>
      <div className="demo-results-body">
        <div className="demo-results-heading">
          <span className="demo-small-label">EVERY ANSWER TELLS A STORY</span>
          <h3>Your responses</h3>
          <p>3 example responses. Try opening one.</p>
        </div>
        <div className="demo-response-list">
          {illustrativeResponses.map((response, i) => (
            <button
              key={response.name}
              aria-label={`View example response from ${response.name}`}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
            >
              <span className="demo-response-avatar">{response.name[0]}</span>
              <span>
                {response.name}
                <small>{response.choice}</small>
              </span>
              <span>
                {response.rating} <Star size={11} fill="currentColor" />
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
        <div className="demo-answer-detail" aria-live="polite">
          <span className="demo-small-label">
            A CLOSER LOOK · {answer.name.toUpperCase()}
          </span>
          <p>“{answer.choice}”</p>
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={14}
                fill={i <= answer.rating ? "currentColor" : "none"}
              />
            ))}
          </div>
        </div>
        <div className="demo-summary">
          <span className="demo-small-label">WHAT MADE THE DIFFERENCE?</span>
          <div>
            <span>
              Thoughtful design <b>2 / 3</b>
            </span>
            <i>
              <span style={{ width: "66.67%" }} />
            </i>
          </div>
          <div>
            <span>
              Helpful people <b>1 / 3</b>
            </span>
            <i>
              <span style={{ width: "33.33%" }} />
            </i>
          </div>
        </div>
      </div>
      <div className="product-demo-footer">
        <span>Example answers, not collected responses.</span>
        <ArrowRight size={14} />
      </div>
    </div>
  );
}
