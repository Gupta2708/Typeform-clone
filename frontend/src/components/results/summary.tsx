"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formsApi } from "@/lib/api/client";
import type { FormDetail } from "@/lib/contracts";
import { TypeBadge } from "@/components/builder/type-badge";
import { ErrorState, LoadingState } from "@/components/ui/query-state";

function number(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    notation: Math.abs(value) >= 1e9 ? "scientific" : "standard",
  }).format(value);
}
export function Summary({ form }: { form: FormDetail }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const version = chosen ?? form.published_version_id;
  const summary = useQuery({
    queryKey: ["summary", form.id, version],
    queryFn: () => formsApi.summary(form.id, version),
  });
  if (!form.versions.length)
    return (
      <div className="empty-workspace">
        <h2>First, start a conversation.</h2>
        <p>Publish your form to see question summaries here.</p>
      </div>
    );
  return (
    <section className="summary-section" aria-label="Version summary">
      <div className="summary-toolbar">
        <div>
          <h2>The story so far</h2>
          <p>
            {summary.data?.total_responses ?? "—"} responses to this version
          </p>
        </div>
        <label className="summary-version">
          <span>Published version</span>
          <select
            className="text-field"
            aria-label="Published version"
            value={version ?? ""}
            onChange={(event) => setChosen(event.target.value)}
          >
            {form.versions.map((item) => (
              <option key={item.id} value={item.id}>
                Version {item.version_number} ·{" "}
                {new Date(item.published_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="summary-explanation">
        Each summary uses the questions people actually answered in this
        version. Percentages use answered responses; skipped answers are counted
        separately.
      </p>
      {summary.isPending ? (
        <LoadingState label="Loading summary" />
      ) : summary.isError ? (
        <ErrorState
          message={summary.error.message}
          onRetry={() => {
            void summary.refetch();
          }}
        />
      ) : (
        <div className="summary-questions">
          {summary.data.questions.map((question, index) => (
            <article className="summary-question" key={question.question_id}>
              <div className="summary-question-heading">
                <TypeBadge type={question.type} />
                <h3>
                  <span>{index + 1}.</span> {question.title}
                </h3>
              </div>
              <p className="summary-denominator">
                <strong>{question.answered_count}</strong> answered ·{" "}
                <strong>{question.skipped_count}</strong> skipped ·{" "}
                {summary.data.total_responses} total
              </p>
              {question.statistics && (
                <dl className="numeric-stats">
                  <div>
                    <dt>
                      {question.type === "rating" ? "Average rating" : "Mean"}
                    </dt>
                    <dd>{number(question.statistics.mean)}</dd>
                  </div>
                  <div>
                    <dt>Minimum</dt>
                    <dd>{number(question.statistics.min)}</dd>
                  </div>
                  <div>
                    <dt>Maximum</dt>
                    <dd>{number(question.statistics.max)}</dd>
                  </div>
                </dl>
              )}
              {question.distribution.length > 0 && (
                <div className="summary-distribution">
                  {question.distribution.map((bucket) => (
                    <div
                      className="distribution-row"
                      key={String(bucket.value)}
                    >
                      <div className="distribution-label">
                        <span>{bucket.label}</span>
                        <span>
                          {bucket.count}{" "}
                          <span className="muted">
                            ·{" "}
                            {bucket.percentage === null
                              ? "—"
                              : `${number(bucket.percentage)}%`}
                          </span>
                        </span>
                      </div>
                      <div className="distribution-track" aria-hidden="true">
                        <span style={{ width: `${bucket.percentage ?? 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {question.text_samples.length > 0 && (
                <div className="text-samples">
                  <span className="small-label">RECENT ANSWERS</span>
                  {question.text_samples.map((sample, i) => (
                    <p key={i}>{sample}</p>
                  ))}
                </div>
              )}
              {!question.answered_count && (
                <p className="summary-unavailable">
                  No answers yet. Statistics will appear when people respond.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
