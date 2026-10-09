"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Inbox } from "lucide-react";
import { useState } from "react";
import { formsApi } from "@/lib/api/client";
import type { ResponseDetail } from "@/lib/contracts";
import { ErrorState, LoadingState } from "@/components/ui/query-state";
import { Modal } from "@/components/ui/modal";
import { Summary } from "@/components/results/summary";

export function Results({ formId }: { formId: string }) {
  const form = useQuery({
    queryKey: ["form", formId],
    queryFn: () => formsApi.get(formId),
  });
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState<"responses" | "summary">("responses");
  const responses = useQuery({
    queryKey: ["responses", formId, offset],
    queryFn: () => formsApi.responses(formId, offset),
  });
  const [selected, setSelected] = useState<ResponseDetail | null>(null);
  return (
    <main className="results-page" id="main-content">
      <header className="results-header">
        <Link className="button button-quiet" href={`/forms/${formId}/builder`}>
          <ArrowLeft size={16} />
          {form.data?.title ?? "Back to builder"}
        </Link>
        <span className="results-location">Results</span>
        <span className="avatar avatar-small">G</span>
      </header>
      <div className="results-content">
        <div className="results-title">
          <div className="eyebrow">EVERY ANSWER TELLS A STORY</div>
          <h1>Your responses</h1>
          <p>
            {responses.data?.total ?? "—"} completed{" "}
            {responses.data?.total === 1 ? "conversation" : "conversations"}
          </p>
        </div>
        <div className="results-tabs" role="tablist" aria-label="Results views">
          <button
            role="tab"
            id="responses-tab"
            aria-controls="responses-panel"
            aria-selected={tab === "responses"}
            className={tab === "responses" ? "active" : ""}
            onClick={() => setTab("responses")}
          >
            Responses<span>{responses.data?.total ?? "—"}</span>
          </button>
          <button
            role="tab"
            id="summary-tab"
            aria-controls="summary-panel"
            aria-selected={tab === "summary"}
            className={tab === "summary" ? "active" : ""}
            onClick={() => setTab("summary")}
          >
            Summary
          </button>
        </div>
        {tab === "summary" ? (
          <div role="tabpanel" id="summary-panel" aria-labelledby="summary-tab">
            {form.data ? (
              <Summary form={form.data} />
            ) : form.isError ? (
              <ErrorState
                message={form.error.message}
                onRetry={() => {
                  void form.refetch();
                }}
              />
            ) : (
              <LoadingState />
            )}
          </div>
        ) : (
          <div
            role="tabpanel"
            id="responses-panel"
            aria-labelledby="responses-tab"
          >
            {responses.isPending ? (
              <LoadingState label="Loading responses" />
            ) : responses.isError ? (
              <ErrorState
                message={responses.error.message}
                onRetry={() => {
                  void responses.refetch();
                }}
              />
            ) : !responses.data.items.length ? (
              <div className="empty-workspace">
                <Inbox size={32} />
                <h2>The conversation is just getting started.</h2>
                <p>
                  Publish and share your form to collect your first response.
                </p>
              </div>
            ) : (
              <>
                <div className="response-table-wrap">
                  <table className="response-table">
                    <thead>
                      <tr>
                        <th>Submitted</th>
                        <th>First answer</th>
                        <th>Version</th>
                        <th>Answered</th>
                        <th>
                          <span className="sr-only">Open response</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {responses.data.items.map((response) => (
                        <tr key={response.id}>
                          <td>
                            {new Date(response.submitted_at).toLocaleString()}
                          </td>
                          <td>
                            {response.answers.find(
                              (answer) => answer.value !== null,
                            )?.display_value ?? "Skipped"}
                          </td>
                          <td>
                            <span className="version-chip">
                              v{response.version_number}
                            </span>
                          </td>
                          <td>
                            {
                              response.answers.filter(
                                (answer) => answer.value !== null,
                              ).length
                            }{" "}
                            of {response.answers.length}
                          </td>
                          <td>
                            <button
                              className="button button-quiet"
                              onClick={() => setSelected(response)}
                              aria-label={`View response ${response.id}`}
                            >
                              View
                              <ArrowUpRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="results-pagination">
                  <span>
                    {offset + 1}–{Math.min(offset + 25, responses.data.total)}{" "}
                    of {responses.data.total}
                  </span>
                  <button
                    className="button button-secondary"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - 25))}
                  >
                    Previous
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={offset + 25 >= responses.data.total}
                    onClick={() => setOffset(offset + 25)}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="A closer look"
        description={
          selected
            ? `${new Date(selected.submitted_at).toLocaleString()} · Published version ${selected.version_number}`
            : "Response detail"
        }
      >
        <div className="response-detail">
          {selected?.answers.map((answer) => (
            <div className="response-detail-answer" key={answer.question_id}>
              <h2>{answer.title}</h2>
              <p className={answer.value === null ? "skipped-answer" : ""}>
                {answer.display_value ?? "Skipped"}
              </p>
            </div>
          ))}
        </div>
      </Modal>
    </main>
  );
}
