"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp, Check, RotateCcw } from "lucide-react";
import { useReducer, useRef } from "react";
import type { Answers, AnswerValue, FormDefinition } from "@/lib/contracts";
import { ApiError } from "@/lib/api/client";
import { normalizeAll, normalizeAnswer } from "@/lib/validation/answers";
import { QuestionContent } from "@/components/player/question-widget";

type PlayerState = {
  index: number;
  answers: Answers;
  direction: number;
  status: "answering" | "transitioning" | "submitting" | "complete" | "error";
  error: string | null;
};
type Action =
  | { type: "answer"; id: string; value: AnswerValue }
  | { type: "move"; index: number; direction: number }
  | { type: "status"; status: PlayerState["status"] }
  | { type: "error"; message: string; index?: number }
  | { type: "reset" };
const initialState: PlayerState = {
  index: 0,
  answers: {},
  direction: 1,
  status: "answering",
  error: null,
};
function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case "answer":
      return {
        ...state,
        answers: { ...state.answers, [action.id]: action.value },
        error: null,
        status: "answering",
      };
    case "move":
      return {
        ...state,
        index: action.index,
        direction: action.direction,
        status: "transitioning",
        error: null,
      };
    case "status":
      return { ...state, status: action.status };
    case "error":
      return {
        ...state,
        error: action.message,
        status: "error",
        index: action.index ?? state.index,
      };
    case "reset":
      return initialState;
  }
}

type Props =
  | { definition: FormDefinition; mode?: "preview"; onSubmit?: never }
  | {
      definition: FormDefinition;
      mode: "public";
      onSubmit: (answers: Answers) => Promise<unknown>;
    };
export function FormPlayer(props: Props) {
  const { definition } = props;
  const [state, dispatch] = useReducer(reducer, initialState);
  const reducedMotion = useReducedMotion();
  const transitionGate = useRef(false);
  const submissionGate = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const question = definition.questions[state.index];
  const busy =
    state.status === "transitioning" || state.status === "submitting";

  function focusAnswer() {
    queueMicrotask(() =>
      root.current
        ?.querySelector<HTMLElement>(
          ".answer-input, [role=radio][tabindex='0']",
        )
        ?.focus(),
    );
  }
  function move(index: number, direction: number) {
    transitionGate.current = !reducedMotion;
    dispatch({ type: "move", index, direction });
    if (reducedMotion) dispatch({ type: "status", status: "answering" });
  }
  function previous() {
    if (!transitionGate.current && !submissionGate.current && state.index > 0)
      move(state.index - 1, -1);
  }
  async function next() {
    if (!question || transitionGate.current || submissionGate.current) return;
    const current = normalizeAnswer(question, state.answers[question.id]);
    if (current.error) {
      dispatch({ type: "error", message: current.error });
      focusAnswer();
      return;
    }
    if (state.index < definition.questions.length - 1) {
      move(state.index + 1, 1);
      return;
    }
    const normalized = normalizeAll(definition.questions, state.answers);
    if (normalized.error) {
      dispatch({
        type: "error",
        message: normalized.error,
        index: definition.questions.findIndex(
          (item) => item.id === normalized.questionId,
        ),
      });
      focusAnswer();
      return;
    }
    if (props.mode !== "public") {
      dispatch({ type: "status", status: "complete" });
      return;
    }
    submissionGate.current = true;
    dispatch({ type: "status", status: "submitting" });
    try {
      await props.onSubmit(normalized.values);
      dispatch({ type: "status", status: "complete" });
    } catch (error) {
      let index = state.index;
      let message =
        "Your response couldn’t be sent. Your answers are still here. Please retry.";
      if (error instanceof ApiError) {
        message = `${error.message} Your answers are still here. Please retry.`;
        const failing = definition.questions.findIndex((item) =>
          error.error.details.some((detail) => detail.question_id === item.id),
        );
        if (failing >= 0) {
          index = failing;
          message =
            error.error.details.find(
              (detail) =>
                detail.question_id === definition.questions[failing].id,
            )?.message ?? message;
        }
      }
      dispatch({ type: "error", message, index });
    } finally {
      submissionGate.current = false;
    }
  }
  function handleKey(event: React.KeyboardEvent) {
    if (!question || event.nativeEvent.isComposing || event.repeat || busy)
      return;
    const target = event.target as HTMLElement;
    const editable = target.matches(
      "input, textarea, select, [contenteditable=true], [role=combobox]",
    );
    if (event.key === "Enter") {
      if (target.matches("select, [role=combobox][aria-expanded=true]")) return;
      if (
        question.type === "long_text" &&
        target.matches("textarea") &&
        !event.ctrlKey &&
        !event.metaKey
      )
        return;
      if (
        event.altKey ||
        (question.type !== "long_text" && (event.ctrlKey || event.metaKey))
      )
        return;
      if (
        target.closest("button") &&
        !target.closest(
          ".choice-row[aria-checked=true], .rating-option[aria-checked=true]",
        )
      )
        return;
      event.preventDefault();
      void next();
      return;
    }
    if (editable || event.ctrlKey || event.metaKey || event.altKey) return;
    const letter = event.key.toUpperCase().charCodeAt(0) - 65;
    if (
      event.key.length === 1 &&
      question.type === "multiple_choice" &&
      letter >= 0 &&
      letter < Math.min(26, question.options.length)
    ) {
      event.preventDefault();
      dispatch({
        type: "answer",
        id: question.id,
        value: question.options[letter].id,
      });
    } else if (
      question.type === "yes_no" &&
      ["A", "B"].includes(event.key.toUpperCase())
    ) {
      event.preventDefault();
      dispatch({
        type: "answer",
        id: question.id,
        value: event.key.toUpperCase() === "A",
      });
    } else if (
      question.type === "rating" &&
      /^[1-9]$/.test(event.key) &&
      Number(event.key) <= question.settings.scale
    ) {
      event.preventDefault();
      dispatch({ type: "answer", id: question.id, value: Number(event.key) });
    } else if (
      !target.closest(".rating-group, .choice-group") &&
      event.key === "ArrowUp"
    ) {
      event.preventDefault();
      previous();
    } else if (
      !target.closest(".rating-group, .choice-group") &&
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      void next();
    }
  }

  if (!question)
    return (
      <div className="player-empty">
        <h1>A blank page. A world of possibilities.</h1>
        <p>Add a question to start your conversation.</p>
      </div>
    );
  if (state.status === "complete")
    return (
      <div className="player-empty">
        <span className="completion-symbol">
          <Check size={28} />
        </span>
        <h1
          tabIndex={-1}
          ref={(node) => {
            node?.focus({ preventScroll: true });
          }}
        >
          {definition.thank_you.title}
        </h1>
        <p>
          {props.mode === "public"
            ? definition.thank_you.description
            : "Preview complete. No response was recorded."}
        </p>
        <span
          className="completed-progress"
          role="progressbar"
          aria-label="Completed"
          aria-valuenow={100}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          100% complete
        </span>
        {props.mode !== "public" && (
          <button
            className="button player-button"
            onClick={() => dispatch({ type: "reset" })}
          >
            <RotateCcw size={16} />
            Start again
          </button>
        )}
      </div>
    );
  const variants = {
    enter: (direction: number) => ({
      opacity: reducedMotion ? 1 : 0,
      y: reducedMotion ? 0 : direction * 18,
    }),
    center: { opacity: 1, y: 0 },
    exit: (direction: number) => ({
      opacity: reducedMotion ? 1 : 0,
      y: reducedMotion ? 0 : -direction * 18,
    }),
  };
  return (
    <div
      className="form-player"
      ref={root}
      onKeyDown={handleKey}
      aria-busy={state.status === "submitting"}
    >
      <div className="player-question-wrap">
        <AnimatePresence mode="wait" initial={false} custom={state.direction}>
          <motion.div
            key={question.id}
            custom={state.direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reducedMotion ? 0 : 0.25 }}
            className="player-question"
            onAnimationComplete={(animation) => {
              if (animation === "center") {
                transitionGate.current = false;
                if (state.status === "transitioning")
                  dispatch({ type: "status", status: "answering" });
              }
            }}
          >
            <fieldset
              className="player-fields"
              disabled={state.status === "submitting"}
            >
              <QuestionContent
                focusOnMount
                error={state.error}
                question={question}
                number={state.index + 1}
                value={state.answers[question.id]}
                onChange={(value) =>
                  dispatch({ type: "answer", id: question.id, value })
                }
              />
              <div className="player-action">
                <button
                  type="button"
                  className="button player-button"
                  disabled={busy}
                  onClick={() => {
                    void next();
                  }}
                >
                  {state.status === "submitting"
                    ? "Sending…"
                    : state.index === definition.questions.length - 1
                      ? props.mode === "public"
                        ? state.status === "error"
                          ? "Retry submission"
                          : "Submit"
                        : "Finish preview"
                      : "OK"}
                  <Check size={18} />
                </button>
                <span className="answer-hint">
                  {question.type === "long_text"
                    ? "Ctrl / ⌘ + Enter"
                    : question.type === "dropdown"
                      ? "Select an option to continue"
                      : "press Enter ↵"}
                </span>
              </div>
            </fieldset>
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
            disabled={state.index === 0 || busy}
            onClick={previous}
          >
            <ArrowUp size={18} />
          </button>
          <button
            aria-label="Next question"
            disabled={busy}
            onClick={() => {
              void next();
            }}
          >
            <ArrowDown size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
