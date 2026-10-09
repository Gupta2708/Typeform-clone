"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Smartphone, X } from "lucide-react";
import { useState } from "react";
import { formsApi } from "@/lib/api/client";
import { FormPlayer } from "@/components/player/form-player";
import { ErrorState, LoadingState } from "@/components/ui/query-state";

export function Preview({ formId }: { formId: string }) {
  const form = useQuery({
    queryKey: ["form", formId],
    queryFn: () => formsApi.get(formId),
  });
  const [mobile, setMobile] = useState(false);
  return (
    <main
      className={`preview-page ${mobile ? "preview-mobile" : ""}`}
      id="main-content"
    >
      <header className="preview-header">
        <Link className="button button-quiet" href={`/forms/${formId}/builder`}>
          <X size={17} />
          <span>Close preview</span>
        </Link>
        <span className="preview-label">
          Preview<span>No responses collected</span>
        </span>
        <div className="view-toggle">
          <button
            className={`icon-button ${!mobile ? "selected" : ""}`}
            aria-label="Desktop preview"
            aria-pressed={!mobile}
            onClick={() => setMobile(false)}
          >
            <Monitor size={18} />
          </button>
          <button
            className={`icon-button ${mobile ? "selected" : ""}`}
            aria-label="Mobile preview"
            aria-pressed={mobile}
            onClick={() => setMobile(true)}
          >
            <Smartphone size={18} />
          </button>
        </div>
      </header>
      <div className="preview-frame">
        {form.isPending ? (
          <LoadingState label="Loading preview" />
        ) : form.isError ? (
          <ErrorState
            message={form.error.message}
            onRetry={() => {
              void form.refetch();
            }}
          />
        ) : (
          <FormPlayer definition={form.data} />
        )}
      </div>
    </main>
  );
}
