# Architecture

## Request path and module boundaries

Next.js App Router has thin workspace, builder, preview, results, and public routes. Client
components use `frontend/src/lib/api/client.ts` for same-origin `/api/v1` requests. Next.js
forwards these to FastAPI with the server-only `API_BASE_URL`, baked into the production
rewrite at build time. Changing its target requires rebuilding. Requests use no-store.

FastAPI routers in `backend/app/api/` handle HTTP; Pydantic `schemas/` validate contracts;
`services/` own drafts, publication, submissions, management, results and summaries;
SQLAlchemy models and Alembic migrations own storage. LocalStorage is not a database.

TanStack Query owns server state and pagination. `useDraftEditor` connects React to a
serialized draft store. A player reducer owns answers, active question, direction and submit
state. Radix handles dialogs/focus, dnd-kit handles ordering, Motion handles transitions and
Lucide supplies icons. Inter is bundled with its OFL license and needs no external font service.

## Database schema

| Table            | Responsibility and constraints                                                           |
| ---------------- | ---------------------------------------------------------------------------------------- |
| creators         | One default creator for the shared workspace                                             |
| forms            | Title, unique stable slug, revision, status, settings, published pointer, UTC timestamps |
| questions        | Editable ordered definitions; unique `(form_id, position)`                               |
| question_options | Editable ordered choices; unique `(question_id, position)`                               |
| form_versions    | Immutable complete JSON definitions; unique `(form_id, version_number)`                  |
| submissions      | Exact version, timestamp, hash; unique `(form_id, idempotency_key)`                      |
| answers          | Typed JSON value and snapshot question key; unique `(submission_id, question_key)`       |

Drafts, submissions and answers remain relational. A version snapshot is deliberately JSON:
it preserves exact wording, order, keys, labels, rules, theme and thank-you content as answered.
Reconstructing history from mutable draft rows would relabel or lose old answers.

Answer question keys have no foreign key to mutable draft questions. Validation checks their
membership in the submitted snapshot. Composite foreign keys enforce that published pointers
and submission versions belong to the same form. A SQLite trigger rejects version updates.
Deletion clears the pointer and cascades only owned data after explicit UI confirmation.
Duplication creates fresh keys/slug and copies only a draft. UTC timestamps are restored as
timezone-aware values; response counts come from submissions rather than mutable counters.

Connections enable foreign keys and a 15-second busy timeout. Writes use `BEGIN IMMEDIATE`
before reading state, serializing competing SQLite writes. Multi-record changes commit or roll
back together. Reordering uses temporary negative positions before assigning final positions,
avoiding unique-constraint collisions. Migrations preserve the intentional forms/versions cycle.

## Autosave, conflict and publication

Typing updates immediately. The store waits 650 ms, sends an aggregate draft with
`expected_revision`, and keeps one request in flight. A generation counter distinguishes
submitted text from newer local edits. An acknowledgement advances the revision without
replacing newer text; the next request sends the latest document. Rename shares this revision.

Failures retain edits and allow retry. A 409 stops the queue and blocks publishing. Resolution
offers a JSON download and warns that **Discard local edits and reload** loses those edits.
Keep my edits, Escape and cancellation retain edits and leave publication blocked. Only a
deliberate discard reloads. Navigation through creator controls first flushes saves; tab closure
warns about dirty data rather than assuming an asynchronous save will finish.

Publication drains saves, checks revision and atomically snapshots a validated definition.
Unchanged revisions reuse their version. Draft edits stay invisible until publication. Slugs
remain stable. Unpublish closes collection and preserves history. An older loaded version can
finish while the form remains open, using its own validation and thank-you content.

## Shared player and submission retry

One `FormPlayer` and renderer registry serve preview and anonymous public forms. The live
builder uses the same widgets. Answers use question IDs. Preview finishes locally and never
submits. Transition/submission guards prevent duplicate Enter advances or concurrent sends.
Normal motion is a short directional slide/fade; reduced motion removes it.

Optional empties are omitted; false and zero are valid. Text emptiness trims whitespace,
long text preserves meaningful newlines, email uses a shared practical rule, numbers must be
finite/in bounds, rating must be an integer in its scale, and choices use snapshot option IDs.
Authoritative backend validation runs before inserting anything.

The browser freezes payload/key for retry. The backend normalizes values, sorts answers and
hashes canonical JSON. Same form/key/hash returns the original receipt; changed payload with
the same key conflicts. Completed retries can recover receipts after closure. Submission and
all answers insert in one transaction. Thank-you requires a receipt; failures retain answers.

Keyboard behavior includes Ctrl/Cmd+Enter for long text, letter/digit shortcuts, radio arrows
and a searchable combobox whose first Enter selects without advancing. Back retains values.
Heading focus avoids automatically opening a phone keyboard; validation focuses its widget.
Dynamic viewport height, safe areas and scrolling content keep navigation reachable.

## Results and tradeoffs

Responses paginate across versions; detail resolves original wording/labels and skipped
questions from snapshots. Summary selects a version, filtering all submissions to it.
Percentages divide by answered count; skips are separate. Empty means/percentages are
unavailable. Numeric means normalize before summing to avoid finite-value overflow.
Workspace search is server-side and pagination exposes forms beyond the first 100.

SQLite makes this assignment explainable. Deploy one backend instance with a durable volume;
this is not a multi-instance database design. A hosted creator is a shared editable workspace,
without private authentication. Advanced workflow/integrations and extra themes are honest
placeholders; bonuses remain deferred. See [deployment](deployment.md) and the
[verification report](phase-6-report.md) for observed checks and limitations.
