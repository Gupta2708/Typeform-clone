"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  CircleCheck,
  List,
  Pause,
  Play,
  Star,
  Type,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { QUESTION_TYPES } from "@/lib/contracts";
import { questionTypes } from "@/lib/question-types";

function subscribeReducedMotion(callback: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", callback);
  return () => preference.removeEventListener("change", callback);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotion() {
  return false;
}

// Hydration starts with the same markup as the server, then applies the preference.
function useLandingReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  );
}

export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useLandingReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduced ? {} : { y: [18, 0] }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function HeroDemo() {
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref, { amount: 0.2 });
  const reduced = useLandingReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [step, setStep] = useState(0);
  const running = playing && visible && !reduced && !hidden;
  const frame = reduced ? 2 : step;
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setStep((value) => (value + 1) % 5), 2200);
    return () => clearInterval(timer);
  }, [running]);
  return (
    <figure
      className="hero-demo"
      ref={ref}
      data-running={running}
      aria-label="Animated product preview. Illustrative answers only; nothing is collected."
    >
      <div className="demo-orbit" aria-hidden="true" />
      <div className="demo-floating-list" aria-hidden="true">
        <span className="demo-small-label">A LITTLE HELLO.</span>
        {[
          [Type, "Your name"],
          [List, "Your favorite thing"],
          [Star, "How did we do?"],
        ].map(([Icon, label], index) => {
          const Component = Icon as typeof Type;
          return (
            <div
              key={String(label)}
              className={
                (frame < 2 ? 0 : frame === 2 ? 1 : 2) === index ? "active" : ""
              }
            >
              <Component size={15} />
              <span>{String(label)}</span>
              <span>0{index + 1}</span>
            </div>
          );
        })}
        <span className="demo-list-ending">
          <Check size={13} /> A happy ending.
        </span>
      </div>
      <div className="demo-browser">
        <div className="demo-browser-chrome">
          <div className="browser-dots">
            <i />
            <i />
            <i />
          </div>
          <span>your next conversation</span>
          <CheckCheck size={15} />
        </div>
        <div className="demo-browser-body" aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={frame}
              className="hero-demo-frame"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? {} : { opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {frame === 4 ? (
                <div className="demo-complete">
                  <CircleCheck size={40} />
                  <h3>That felt like a conversation.</h3>
                  <p>Preview complete. No response collected.</p>
                </div>
              ) : (
                <>
                  <span className="demo-question-number">
                    {frame < 2 ? 1 : frame === 2 ? 2 : 3}{" "}
                    <ArrowRight size={15} />
                  </span>
                  <div className="demo-question-content">
                    <span className="demo-small-label">
                      LET’S GET TO KNOW YOU.
                    </span>
                    <h3>
                      {frame < 2
                        ? "First things first, what’s your name?"
                        : frame === 2
                          ? "What made the biggest difference?"
                          : "How did we make you feel?"}
                    </h3>
                    <p>
                      {frame < 2
                        ? "We’re happy you’re here."
                        : frame === 2
                          ? "Sometimes, it’s the little things."
                          : "A little feedback goes a long way."}
                    </p>
                    {frame < 2 ? (
                      <div
                        className={`demo-answer-line ${frame === 1 ? "typed" : ""}`}
                      >
                        {frame === 1 ? "Avery" : "Type your answer here…"}
                        <span className="demo-caret" />
                      </div>
                    ) : frame === 2 ? (
                      <div className="demo-choice-presentation">
                        <div className="selected">
                          <span>A</span>Thoughtful design
                          <Check size={16} />
                        </div>
                        <div>
                          <span>B</span>Helpful people
                        </div>
                      </div>
                    ) : (
                      <div className="demo-rating-presentation">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <span
                            key={value}
                            className={value === 5 ? "selected" : ""}
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="demo-ok">
                      OK <Check size={15} />
                    </span>
                    <small className="demo-key-hint">press Enter ↵</small>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="demo-progress">
            <span
              style={{
                width: `${frame === 4 ? 100 : ((frame < 2 ? 1 : frame === 2 ? 2 : 3) / 3) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
      <div
        className={`demo-floating-receipt ${frame === 4 ? "complete" : ""}`}
        aria-hidden="true"
      >
        <span className="receipt-icon">
          <Check size={19} />
        </span>
        <div>
          <strong>
            {frame === 4
              ? "A lovely little preview."
              : "Made for a human moment."}
          </strong>
          <small>
            {frame === 4
              ? "Avery · Thoughtful design · 5 / 5"
              : "One question. One thoughtful answer."}
          </small>
        </div>
        <Star size={18} />
      </div>
      <figcaption>
        <span>
          <i />
          Illustrative preview. Nothing is collected.
        </span>
        <button
          className="demo-pause"
          onClick={() => setPlaying(!playing)}
          aria-label={
            playing ? "Pause product animation" : "Play product animation"
          }
          disabled={!!reduced}
        >
          {playing && !reduced ? <Pause size={14} /> : <Play size={14} />}{" "}
          {reduced ? "Reduced motion" : playing ? "Pause" : "Play"}
        </button>
      </figcaption>
    </figure>
  );
}

export function TypeShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.15 });
  const [playing, setPlaying] = useState(true);
  const reduced = useLandingReducedMotion();
  return (
    <div
      ref={ref}
      className="type-showcase"
      data-playing={playing && visible && !reduced}
    >
      <div className="type-showcase-window">
        {[QUESTION_TYPES.slice(0, 4), QUESTION_TYPES.slice(4)].map(
          (types, row) => (
            <div className={`type-ticker row-${row}`} key={row}>
              {[false, true].map((duplicate) => (
                <ul
                  key={String(duplicate)}
                  aria-hidden={duplicate || undefined}
                  className={duplicate ? "ticker-copy" : ""}
                >
                  {types.map((type) => {
                    const { icon: Icon, label, color } = questionTypes[type];
                    return (
                      <li key={type}>
                        <span className={`question-type-badge type-${color}`}>
                          <Icon size={22} />
                        </span>
                        {label}
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          ),
        )}
      </div>
      <button
        className="showcase-pause"
        disabled={!!reduced}
        onClick={() => setPlaying(!playing)}
        aria-label={
          playing ? "Pause question showcase" : "Play question showcase"
        }
      >
        {playing && !reduced ? <Pause size={15} /> : <Play size={15} />}{" "}
        {reduced
          ? "A format for every idea"
          : playing
            ? "Pause the parade"
            : "Play the parade"}
      </button>
    </div>
  );
}
