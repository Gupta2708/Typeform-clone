# Phase 2 — persistent publishing and submissions

Implemented an actual create/edit/save/publish/anonymous-submit/results flow. Builder title,
question text/description and required edits persist through a serialized 650 ms save queue.
Publication waits for all pending edits. Public collection reads an immutable version, validates
answers against that version, and atomically writes one submission with its answers.

SQLite rejects updates to published snapshots through a migration-installed trigger. Revision
guards apply to draft replacement and rename; draft edits never alter publication or historical
answers. Idempotency accepts semantically identical retries (including after unpublishing) and
rejects reuse for different answers. Zero and false are valid answers; optional empty values
are omitted. Results use original published prompts and option labels, including skipped answers.

## Observed verification

| Check | Result |
| --- | --- |
| Backend pytest | 26 passed; one upstream Starlette/httpx deprecation warning |
| Ruff lint and formatting | Passed |
| Alembic upgrade and drift check | Head applied; no new upgrade operations |
| Frontend typecheck, lint, production build | Passed |
| Existing browser suite | 4 passed |
| New anonymous publishing/results browser flow | Passed after correcting an ambiguous alert locator |
| Real API process restart | Draft, published snapshot, stored answer and original idempotency receipt persisted |

The restart check used `python scripts/check_restart.py create`, stopped the actual API process,
started a new process, then ran `python scripts/check_restart.py verify`. The repeated submission
returned its original receipt and response count remained one. It uses the local development
database; its verification form is retained as real data.

Browser assertions cover inline edits published before the debounce elapsed, required validation,
anonymous response via a separate browser context, confirmed-success thank-you, 100% completion,
and the answer appearing in creator results. Foundation screenshots were reviewed again; the
inline required marker was adjusted to stay beside the question title.

## Remaining phase work

Full workspace CRUD, the eight-type picker, type changes, option/number/rating settings,
drag/keyboard reorder and complete settings are Phase 3. Autosave race/conflict browser checks
and the mandatory five-screen visual gate remain there. The player still needs searchable
dropdowns, focus/error relationships and full keyboard/mobile/retry checks in Phase 4. Summary
aggregates and final published seed data are Phase 5. Final broad checks and durable-hosting
instructions are Phase 6. No hosted deployment or Git push has occurred.

Commit: `feat: implement persistent publishing and submissions`.
Author and committer: `Gupta2708 <guptavaibhav2708@gmail.com>`; no co-author trailers.
