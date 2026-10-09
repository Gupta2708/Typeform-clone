"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp, Check, RotateCcw } from "lucide-react";
import { useReducer } from "react";
import type { Answers, AnswerValue, FormDefinition } from "@/lib/contracts";
import { QuestionContent } from "@/components/player/question-widget";

type PlayerState = { index: number; answers: Answers; complete: boolean };
type Action =
  | { type: "answer"; id: string; value: AnswerValue }
  | { type: "next"; length: number }
  | { type: "previous" }
  | { type: "reset" };
const initialState: PlayerState = { index: 0, answers: {}, complete: false };

function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case "answer":
      return {
        ...state,
        answers: { ...state.answers, [action.id]: action.value },
      };
    case "next":
      return state.index + 1 < action.length
        ? { ...state, index: state.index + 1 }
        : { ...state, complete: true };
    case "previous":
      return { ...state, index: Math.max(0, state.index - 1) };
    case "reset":
      return initialState;
  }
}

/** Preview-only foundation. Public submission orchestration is added in Phase 2. */
export function FormPlayer({ definition }: { definition: FormDefinition }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const reducedMotion = useReducedMotion();
  const question = definition.questions[state.index];
  if (!question)
    return (
      <div className="player-empty">
        <h1>A blank page. A world of possibilities.</h1>
        <p>Add a question to start your conversation.</p>
      </div>
    );
  if (state.complete)
    return (
      <div className="player-empty">
        <span className="completion-symbol">
          <Check size={28} />
        </span>
        <h1>{definition.thank_you.title}</h1>
        <p>Preview complete. No response was recorded.</p>
        <button
          className="button player-button"
          onClick={() => dispatch({ type: "reset" })}
        >
          <RotateCcw size={16} />
          Start again
        </button>
      </div>
    );

  return (
    <div className="form-player">
      <div className="player-question-wrap">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={question.id}
            initial={{
              opacity: reducedMotion ? 1 : 0,
              y: reducedMotion ? 0 : 18,
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: reducedMotion ? 1 : 0,
              y: reducedMotion ? 0 : -18,
            }}
            transition={{ duration: reducedMotion ? 0 : 0.25 }}
            className="player-question"
          >
            <QuestionContent
              question={question}
              number={state.index + 1}
              value={state.answers[question.id]}
              onChange={(value) =>
                dispatch({ type: "answer", id: question.id, value })
              }
            />
            <div className="player-action">
              <button
                className="button player-button"
                onClick={() =>
                  dispatch({
                    type: "next",
                    length: definition.questions.length,
                  })
                }
              >
                {state.index === definition.questions.length - 1
                  ? "Finish preview"
                  : "OK"}
                <Check size={18} />
              </button>
              <span className="answer-hint">
                {question.required ? "Required" : "Optional"}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <footer className="player-footer">
        <div className="player-progress">
          <span>
            Question {state.index + 1} of {definition.questions.length}
          </span>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Question position"
            aria-valuenow={Math.round(
              (state.index / definition.questions.length) * 100,
            )}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              style={{
                width: `${(state.index / definition.questions.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="player-navigation">
          <button
            aria-label="Previous question"
            disabled={state.index === 0}
            onClick={() => dispatch({ type: "previous" })}
          >
            <ArrowUp size={18} />
          </button>
          <button
            aria-label="Next question"
            onClick={() =>
              dispatch({ type: "next", length: definition.questions.length })
            }
          >
            <ArrowDown size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
