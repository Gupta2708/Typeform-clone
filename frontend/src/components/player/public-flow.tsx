"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { ApiError, publicApi } from "@/lib/api/client";
import type { Answers, SubmissionRequest } from "@/lib/contracts";
import { FormPlayer } from "@/components/player/form-player";
import { ErrorState, LoadingState } from "@/components/ui/query-state";

export function PublicFlow({ slug }: { slug: string }) {
  const form = useQuery({
    queryKey: ["public-form", slug],
    queryFn: () => publicApi.get(slug),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const attempt = useRef<{
    fingerprint: string;
    payload: SubmissionRequest;
  } | null>(null);
  async function submit(answers: Answers) {
    if (!form.data) throw new Error("The form hasn’t loaded.");
    const entries = Object.entries(answers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([question_id, value]) => ({ question_id, value }));
    const fingerprint = JSON.stringify({
      version: form.data.form_version_id,
      answers: entries,
    });
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = {
        fingerprint,
        payload: {
          form_version_id: form.data.form_version_id,
          idempotency_key: crypto.randomUUID(),
          answers: entries,
        },
      };
    return publicApi.submit(slug, attempt.current.payload);
  }
  return (
    <main className="public-page" id="main-content">
      {form.isPending ? (
        <LoadingState label="Opening your form" />
      ) : form.isError ? (
        form.error instanceof ApiError &&
        [404, 410].includes(form.error.status) ? (
          <div className="player-empty">
            <h1>
              {form.error.status === 410
                ? "This conversation is on pause."
                : "We couldn’t find this form."}
            </h1>
            <p>{form.error.message}</p>
          </div>
        ) : (
          <ErrorState
            message="We couldn’t open this form. Please try again."
            onRetry={() => {
              void form.refetch();
            }}
          />
        )
      ) : (
        <FormPlayer definition={form.data} mode="public" onSubmit={submit} />
      )}
    </main>
  );
}
