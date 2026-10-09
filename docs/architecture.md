# Architecture and milestone boundaries

## Why this stack

Next.js App Router supplies conventional routes and production tooling. Strict TypeScript
describes the same form/answer shapes as Pydantic. FastAPI supplies typed request validation
and OpenAPI. SQLAlchemy and Alembic make SQLite relationships and schema evolution explicit.
The goal is a small application that can be explained module by module.

Next.js proxies `/api/v1/*` to FastAPI using the server-only `API_BASE_URL`. The browser sees
same-origin API URLs; no backend credentials are exposed in public environment variables.
FastAPI also uses an explicit CORS allowlist for direct local access.

## Storage boundaries

Seven application tables exist: creators, forms, questions, question_options, form_versions,
submissions, and answers. Draft questions/options are editable relational records. Published
versions will contain immutable validated definition snapshots, preserving titles, options,
required rules, order, theme, and thank-you content exactly as answered.

An answer's question key intentionally has no cascading foreign key to an editable draft
question. Its future submission service validates snapshot membership. Submissions have a
composite foreign key `(form_id, form_version_id)` referencing `(form_id, id)` on versions.
Forms have an equivalent same-form constraint for their published pointer. This ownership
invariant is enforced by SQLite itself and tested with direct invalid writes.

SQLite foreign keys are enabled on every connection. Timestamps are stored as UTC and restored
as timezone-aware values before JSON serialization. Counts are derived from submissions.
Question and option positions are unique within their parents. Draft replacement in Phase 2
will use a transaction and a disjoint temporary position range to avoid reorder collisions.

Alembic migrations use stable SQL types rather than importing mutable application types. The
forms/versions cycle is intentional; downgrade clears publication pointers before dropping
owned data. Downgrading removes data and is not a reset command for normal users.

## State and contract foundations

TanStack Query handles API loading, errors, invalidation, and refetching. Form creation uses
the real API. Components do not treat localStorage as a database. Preview answers are local
ephemeral state by design and never contribute to response counts.

Pydantic/TypeScript question definitions distinguish text, choice, number, and rating settings
and cover all eight required types. Optional unanswered public values are omitted. Numeric
values must be finite; booleans and numbers remain distinct. Draft schemas allow unfinished
titles/options, but reject invalid types and duplicate identifiers. Publication/submission
validation is stricter and belongs to the next functional milestone.

Bounds: 1 MiB write payloads, 100 questions per form, 100 choices per choice question, 200-character
form titles, 500-character question/option titles, 2,000-character descriptions, and 10,000-character
text answers. Ratings support scales from 2–10 and default to 5. The request-size middleware
also handles chunked bodies instead of trusting Content-Length.

## Next milestones: required semantics

- Draft and metadata writes share a revision. The serialized 650 ms save queue sends only one
  request at a time and never overwrites newer local edits with old acknowledgements.
- Conflicts retain local edits and block publishing. Discard/reload requires explicit
  confirmation with a warning about lost edits and a downloadable local draft option.
- Publication flushes saves, checks the revision, and creates a new immutable snapshot.
  Public reads use that snapshot, never a mutable draft. Links stay stable.
- A loaded older version remains answerable after republishing while the form is open.
  Idempotent completed retries may return their original receipt even after unpublishing.
- Atomic submission validates every answer before commit. Unique `(form_id, idempotency_key)`
  plus normalized payload hashes resolves retry/concurrency without duplicate records.
- Results detail resolves historical wording/options from snapshots; summaries stay scoped
  to a selected version and use answered-only percentage denominators.

These are planned behaviors, not claims that the foundation already implements them.

## Runtime and deployment boundary

There is one default creator, not private multi-user authentication. A hosted demo using this
mode is a shared editable workspace. Deploy FastAPI as one instance with SQLite on a mounted
persistent path. Run migrations and seeds explicitly, never on normal application startup.
The browser-test server alone bootstraps a separately configured test database.

The local workspace has no hosted demo. Deployment instructions and provider verification are
completed in Phase 6. A public source repository and working hosted demo remain required for
the final assignment submission.
