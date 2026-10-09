"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ArrowUpRight, Star } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { formsApi } from "@/lib/api/client";

function useExamples() {
  return useQuery({
    queryKey: ["landing", "examples"],
    queryFn: () => formsApi.list(),
    staleTime: 30_000,
    retry: 1,
  });
}
export function SampleLink({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  const forms = useExamples();
  const sample =
    forms.data?.items.find(
      (form) => form.slug === "demo-experience" && form.status === "published",
    ) ?? forms.data?.items.find((form) => form.status === "published");
  if (forms.isPending)
    return (
      <button className={className} disabled>
        Loading sample…
      </button>
    );
  return (
    <Link
      className={className}
      href={sample ? `/to/${sample.slug}` : "/workspace"}
    >
      {sample
        ? label
        : forms.isError
          ? "Open workspace"
          : "Create your first form"}
    </Link>
  );
}

const examples = [
  {
    title: "Customer feedback.",
    slug: "demo-experience",
    lookup: "Customer feedback",
    text: "Make a little room for honest feedback. Discover what made the difference.",
    prompt: "How was your experience?",
    category: "LISTEN A LITTLE CLOSER",
    className: "feedback",
    visual: "rating",
  },
  {
    title: "Bring people together.",
    slug: "demo-event",
    lookup: "Event registration",
    text: "From the first invitation to the guest list. Make showing up feel effortless.",
    prompt: "Which ticket is right for you?",
    category: "EVENT REGISTRATION",
    className: "event",
    visual: "choice",
  },
  {
    title: "Meet your next idea.",
    slug: "demo-discovery",
    lookup: "Product discovery",
    text: "Ask a better question. Find an unexpected insight. See what’s possible.",
    prompt: "What does a great workday look like?",
    category: "PRODUCT DISCOVERY",
    className: "discovery",
    visual: "text",
  },
];

export function ExampleCarousel() {
  const forms = useExamples();
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  function go(index: number) {
    const element = rail.current;
    if (!element) return;
    const cards = element.querySelectorAll<HTMLElement>(".example-slide");
    element.scrollTo({
      left: cards[index].offsetLeft - cards[0].offsetLeft,
      behavior: reduced ? "instant" : "smooth",
    });
  }
  return (
    <div
      className="example-carousel"
      aria-roledescription="carousel"
      aria-label="Example forms"
    >
      <div
        className="example-rail"
        ref={rail}
        onScroll={(event) => {
          const element = event.currentTarget;
          const card = element.querySelector<HTMLElement>(".example-slide");
          if (card)
            setActive(
              Math.min(
                2,
                Math.max(
                  0,
                  Math.round(element.scrollLeft / (card.offsetWidth + 24)),
                ),
              ),
            );
        }}
      >
        {examples.map((example, index) => {
          const form =
            forms.data?.items.find((form) => form.slug === example.slug) ??
            forms.data?.items.find((form) =>
              form.title.includes(example.lookup),
            );
          const href = form
            ? form.status === "published"
              ? `/to/${form.slug}`
              : `/forms/${form.id}/preview`
            : "/workspace";
          return (
            <article
              key={example.slug}
              className={`example-slide ${example.className}`}
              aria-roledescription="slide"
              aria-label={`${index + 1} of 3`}
            >
              <div className="example-copy">
                <span className="landing-eyebrow">{example.category}</span>
                <h3>{example.title}</h3>
                <p>{example.text}</p>
                <Link href={href} className="landing-button dark">
                  {form
                    ? form.status === "published"
                      ? "Try this form"
                      : "Preview draft"
                    : "Make your own"}
                  <ArrowUpRight size={17} />
                </Link>
                {form?.status === "draft" && (
                  <small className="example-draft-note">
                    Creator preview · unpublished
                  </small>
                )}
              </div>
              <div className="example-form" aria-hidden="true">
                <span className="example-form-brand">
                  a little conversation.
                </span>
                <span className="example-question-number">01 →</span>
                <h4>{example.prompt}</h4>
                {example.visual === "rating" ? (
                  <div className="example-stars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} fill="currentColor" size={23} />
                    ))}
                  </div>
                ) : example.visual === "choice" ? (
                  <div className="example-choice">
                    <span>A</span>General admission
                    <ArrowRight size={16} />
                  </div>
                ) : (
                  <div className="example-underline">
                    Tell us a little more…
                  </div>
                )}
                <span className="example-ok">OK ✓</span>
              </div>
            </article>
          );
        })}
      </div>
      <div className="example-controls">
        <div className="example-dots">
          {examples.map((example, index) => (
            <button
              key={example.slug}
              aria-label={`Show ${example.category.toLowerCase()} example`}
              aria-current={active === index ? "true" : undefined}
              onClick={() => go(index)}
            />
          ))}
        </div>
        <span className="example-position" aria-live="polite">
          {active + 1} / 3
        </span>
        <button
          aria-label="Previous example"
          disabled={active === 0}
          onClick={() => go(active - 1)}
        >
          <ArrowLeft size={22} />
        </button>
        <button
          aria-label="Next example"
          disabled={active === 2}
          onClick={() => go(active + 1)}
        >
          <ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
}
