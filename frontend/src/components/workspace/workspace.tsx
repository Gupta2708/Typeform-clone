"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FolderClosed,
  Grid2X2,
  LayoutList,
  Plus,
  Search,
} from "lucide-react";
import { useState } from "react";
import { formsApi } from "@/lib/api/client";
import type { FormCard } from "@/lib/contracts";
import { Brand } from "@/components/ui/brand";
import { Modal } from "@/components/ui/modal";
import { ErrorState, LoadingState } from "@/components/ui/query-state";

function FormTile({ form }: { form: FormCard }) {
  return (
    <Link
      href={`/forms/${form.id}/builder`}
      className="form-card"
      aria-label={`Open ${form.title}`}
    >
      <div className="form-thumbnail">
        <span className="thumbnail-eyebrow">
          A little curiosity goes a long way.
        </span>
        <h3>{form.title}</h3>
        <div className="thumbnail-answer" />
        <span className="thumbnail-button">
          Let’s begin <ArrowRight size={11} />
        </span>
      </div>
      <div className="form-card-details">
        <div className="form-card-title">
          {form.title}
          <ChevronRight size={17} />
        </div>
        <div className="form-card-meta">
          <span className={`status-chip ${form.status}`}>
            <span />
            {form.status === "published" ? "Published" : "Draft"}
          </span>
          <span>
            {form.response_count}{" "}
            {form.response_count === 1 ? "response" : "responses"}
          </span>
        </div>
        <div className="form-card-date">
          Edited{" "}
          {new Intl.DateTimeFormat("en", {
            day: "numeric",
            month: "short",
          }).format(new Date(form.updated_at))}
          <span>
            {form.question_count}{" "}
            {form.question_count === 1 ? "question" : "questions"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Workspace() {
  const router = useRouter();
  const client = useQueryClient();
  const forms = useQuery({ queryKey: ["forms"], queryFn: formsApi.list });
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const create = useMutation({
    mutationFn: formsApi.create,
    onSuccess: async (form) => {
      await client.invalidateQueries({ queryKey: ["forms"] });
      setOpen(false);
      router.push(`/forms/${form.id}/builder`);
    },
  });
  const filtered =
    forms.data?.items.filter((form) =>
      form.title.toLowerCase().includes(search.trim().toLowerCase()),
    ) ?? [];
  const createTrigger = (
    <button className="button button-primary">
      <Plus size={17} />
      Create form
    </button>
  );

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <Link
          href="/workspace"
          className="brand-link"
          aria-label="Typeform builder workspace"
        >
          <Brand />
        </Link>
        <div className="workspace-identity">
          <span className="workspace-initial">G</span>
          <div>
            <strong>Gupta’s workspace</strong>
            <span>Personal workspace</span>
          </div>
        </div>
        <nav aria-label="Workspace navigation">
          <Link
            href="/workspace"
            className="sidebar-link active"
            aria-current="page"
          >
            <FolderClosed size={18} />
            My forms
          </Link>
        </nav>
        <div className="sidebar-section-label">WORKSPACES</div>
        <Link href="/workspace" className="workspace-link">
          <span className="workspace-dot" />
          My workspace
          <span className="sidebar-count">{forms.data?.total ?? "—"}</span>
        </Link>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="small-label">MADE FOR CONVERSATIONS</span>
            <p>
              Better questions.
              <br />
              More human answers.
            </p>
          </div>
          <div className="account">
            <span className="avatar">G</span>
            <div>
              <strong>Gupta</strong>
              <span>Personal account</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <span className="breadcrumb">
            <FolderClosed size={15} />
            Workspaces
            <ChevronRight size={14} />
            <strong>My workspace</strong>
          </span>
          <span className="topbar-account">
            <span className="avatar avatar-small">G</span>
          </span>
        </header>
        <main className="workspace-content" id="main-content">
          <div className="workspace-heading">
            <div>
              <div className="eyebrow">YOUR IDEAS, IN GOOD COMPANY</div>
              <h1>My workspace</h1>
              <p>A home for your forms and the conversations they start.</p>
            </div>
            <Modal
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (next) {
                  setTitle("");
                  create.reset();
                }
              }}
              title="Start a new conversation"
              description="Give your form a name. You can change it later."
              trigger={createTrigger}
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (title.trim()) create.mutate(title.trim());
                }}
              >
                <label className="field-label" htmlFor="form-name">
                  Form name
                </label>
                <input
                  className="text-field"
                  id="form-name"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Customer feedback"
                  maxLength={200}
                  required
                  autoFocus
                />
                {create.error && (
                  <p className="field-error" role="alert">
                    {create.error.message}
                  </p>
                )}
                <div className="dialog-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="button button-primary"
                    disabled={!title.trim() || create.isPending}
                  >
                    {create.isPending ? "Creating…" : "Create form"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </Modal>
          </div>
          <div className="workspace-toolbar">
            <div className="forms-label">
              All forms <span>{forms.data?.total ?? "—"}</span>
              <ChevronDown size={14} />
            </div>
            <div className="workspace-tools">
              <label className="search-field">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search forms"
                  aria-label="Search forms"
                />
              </label>
              <div className="view-toggle" aria-label="Form layout">
                <button
                  className={`icon-button ${layout === "grid" ? "selected" : ""}`}
                  aria-label="Grid view"
                  aria-pressed={layout === "grid"}
                  onClick={() => setLayout("grid")}
                >
                  <Grid2X2 size={17} />
                </button>
                <button
                  className={`icon-button ${layout === "list" ? "selected" : ""}`}
                  aria-label="List view"
                  aria-pressed={layout === "list"}
                  onClick={() => setLayout("list")}
                >
                  <LayoutList size={18} />
                </button>
              </div>
            </div>
          </div>
          {forms.isPending ? (
            <LoadingState />
          ) : forms.isError ? (
            <ErrorState
              message={forms.error.message}
              onRetry={() => {
                void forms.refetch();
              }}
            />
          ) : filtered.length ? (
            <div
              className={`forms-grid ${layout === "list" ? "forms-list" : ""}`}
            >
              {filtered.map((form) => (
                <FormTile key={form.id} form={form} />
              ))}
            </div>
          ) : (
            <div className="empty-workspace">
              <FolderClosed size={35} strokeWidth={1.2} />
              <h2>
                {search
                  ? "No forms found"
                  : "Every conversation starts with a question."}
              </h2>
              <p>
                {search
                  ? "Try a different form name."
                  : "Create your first form and make room for good answers."}
              </p>
              {!search && (
                <button
                  className="button button-primary"
                  onClick={() => setOpen(true)}
                >
                  <Plus size={17} />
                  Create your first form
                </button>
              )}
            </div>
          )}
          <div className="workspace-footer">
            <span>A thoughtful question can change everything.</span>
            <span>
              Built for a more human conversation <ArrowRight size={13} />
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
