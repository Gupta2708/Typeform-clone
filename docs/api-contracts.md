# API contracts

The Pydantic schemas and TypeScript contracts are the implementation sources of truth.
All interfaces described below are implemented. Creator and public paths share the `/api/v1`
prefix but expose separate definitions and behavior.

## Available interfaces

- `GET /health`: 200 `{ "status": "ok", "database": "ready" }`; 503 if the schema/database
  is unavailable. Startup never silently creates tables.
- `GET /api/v1/forms`: `limit` 1–100 (default 100), `offset` >=0; returns
  `{items: FormCard[], total, limit, offset}` ordered by most recently edited, then ID.
- `POST /api/v1/forms`: `{title?: string}`; default `Untitled form`. Nonblank trimmed title,
  maximum 200 characters. Returns 201 `FormDetail`.
- `GET /api/v1/forms/{id}`: UUID; returns 200 `FormDetail`, 404 for an unknown form,
  422 for malformed identifiers.

`FormCard`: UUID `id`, `title`, opaque stable `slug`, draft/published `status`, `draft_revision`,
derived `response_count`, `question_count`, UTC `created_at`/`updated_at`.

`FormDetail`: card fields plus `theme`, `thank_you`, ordered `questions`, nullable
`published_version_id`, and `versions[]` metadata (`id`, `version_number`,
`source_draft_revision`, `published_at`). Creator metadata is never part of the planned
public response.

## Shared definition

`FormDefinition`: title, `{key: "neutral"}` theme, `{title, description}` thank-you content,
ordered questions. Each question has UUID `id`, discriminant `type`, title, description,
boolean required, type-specific settings, and ordered options (`{id, label}`).

Types: `short_text`, `long_text`, `email`, `yes_no` use no options and empty settings;
`multiple_choice` and `dropdown` use options; `number` has optional finite numeric min/max;
`rating` has an integer scale 2–10, default 5. No arbitrary extra fields are accepted.

Draft definitions permit unfinished titles/labels. Unknown types, duplicate question/option
keys, impossible numeric ranges, illegal options/settings, and oversized fields are rejected.
Publish adds stricter validation of form/question/thank-you titles and choice labels.

Bounds: 100 questions, 100 options per choice question, 200-character form title,
500-character question/option title, 2,000-character description, 10,000-character answer text,
1 MiB write requests (including chunked bodies).

## Creator write and results interfaces

- `PATCH /forms/{id}`: `{expected_revision, title}`; uses the same revision as draft writes.
- `PUT /forms/{id}/draft`: full definition plus `expected_revision`; positions assigned
  server-side from arrays; return acknowledged `FormDetail`.
- `POST /forms/{id}/duplicate`: new IDs/slug, draft only, no versions/submissions copied.
- `DELETE /forms/{id}`: 204 after explicit destructive-action UI confirmation.
- `POST /forms/{id}/publish`: `{expected_revision}`; validate and atomically snapshot/publish.
- `POST /forms/{id}/unpublish`: close public collection while preserving history.
- `GET /forms/{id}/responses` and `/responses/{responseId}`: paginated table and immutable detail.
- `GET /forms/{id}/summary?form_version_id={uuid}`: explicit version-scoped aggregates.

All paths above are relative to `/api/v1`. Stale revision returns 409, never silent overwrite.

## Public interfaces

- `GET /public/forms/{slug}`: `PublicForm` = sanitized immutable definition plus
  `form_version_id`; never exposes draft/results/creator fields.
- `POST /public/forms/{slug}/responses`: `{form_version_id, idempotency_key, answers}`;
  answer entries contain `question_id` and `value`. Returns 201 receipt on first success,
  200 original receipt on matching retry. Receipt: `{id, form_version_id, submitted_at}`.

Values: text/email string, finite JSON number, yes/no boolean, rating integer, choice/dropdown
option UUID string. Optional unanswered entries are omitted; null is not the convention.
Strict unions preserve `false` and `0`. Required/type/range/snapshot-membership checks occur
before any insertion. Unknown/duplicate IDs and incompatible values are rejected.

Submitted version must belong to the same form. A loaded older published version remains
answerable while the form is open. Same key/same normalized payload returns its receipt;
same key/different payload conflicts. Completed retries may return receipts after closure.

## Errors

Consistent envelope: `{error: {code, message, details: [{field?, question_id?, message}]}}`.
Statuses: 201 created, 204 deleted, 404 unknown, 410 closed/unpublished, 409 revision/attempt
conflict, 413 oversized payload, 422 validation, 503 unhealthy database. Unexpected errors
return a generic 500 envelope; server-side logs may contain diagnostic detail.

## Results and summary payloads

Responses use `limit` 1–100 (default 25) and `offset` >=0. They return `{items,total,limit,offset}`,
ordered by UTC submission time descending then ID. Each response contains receipt fields,
`version_number`, and the original definition's ordered answers (question ID/title/type/required,
value and display_value). Skips use null in these read payloads; submitted optional entries are
omitted. Choice display labels are resolved from the immutable snapshot.

Summary accepts optional `form_version_id`; default is the current published pointer (also
retained after unpublishing). A foreign/unknown version is 404. A never-published form returns
null version metadata, zero total, and an empty question list. Payload:
`{form_version_id,version_number,total_responses,questions}`. Each question includes original
ID/title/type/required, answered_count, skipped_count, distribution buckets `{value,label,count,
percentage}`, nullable statistics `{min,max,mean}`, and up to five recent text/email samples.

Only submissions for that exact version enter aggregates. Percentages use answered_count,
not total submissions; skipped_count is total minus answered. With no answers, percentages and
statistics are null. Zero/false remain answered values. Numeric means normalize by the largest
absolute value before summing to avoid overflow from large finite values.
