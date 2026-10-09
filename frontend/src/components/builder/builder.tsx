"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { formsApi } from "@/lib/api/client";
import { BuilderEditor } from "@/components/builder/builder-editor";
import { ErrorState, LoadingState } from "@/components/ui/query-state";

export function Builder({ formId }: { formId: string }) {
  const form = useQuery({
    queryKey: ["form", formId],
    queryFn: () => formsApi.get(formId),
  });
  if (form.isPending)
    return (
      <main className="full-height" id="main-content">
        <LoadingState label="Opening your form" />
      </main>
    );
  if (form.isError)
    return (
      <main className="full-height" id="main-content">
        <Link href="/workspace" className="button button-quiet">
          <ArrowLeft size={17} />
          Workspace
        </Link>
        <ErrorState
          message={form.error.message}
          onRetry={() => {
            void form.refetch();
          }}
        />
      </main>
    );
  return <BuilderEditor key={formId} initial={form.data} />;
}
