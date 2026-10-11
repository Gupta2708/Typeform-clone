# PostgreSQL deployment checkpoint

Observed locally on **2026-10-11**. This report covers the approved Vercel + Render Free +
Neon adaptation. It does not claim a deployed or verified hosted demo.

## Changes

- Added locked psycopg 3 binary dependencies. Standard PostgreSQL URLs retain generated
  credentials/TLS parameters and select the installed driver. SQLite remains the default,
  including explicit `sqlite+pysqlite` URLs and connection-level foreign-key enforcement.
- Added PostgreSQL branches to the initial/immutable-version migrations: create the circular
  ownership foreign key after both tables exist, and reject snapshot updates using a PL/pgSQL
  trigger. Existing SQLite installations keep the same schema and migration revisions.
- Added PostgreSQL creator upserts and transaction-scoped advisory write locking. Application
  writes serialize before reading mutable state, retaining revision conflicts, publication ordering
  and submission idempotency. The global lock intentionally limits concurrent write throughput.
- Added opt-in `SEED_DEMO` startup fixtures, default off locally. Render's Blueprint enables
  them for the demo; repeated starts preserve existing edits and responses.
- Added a Free Render Docker Blueprint with the Neon URI entered privately in its dashboard,
  a complete provider setup/backup guide, and PostgreSQL options for backend/browser tests.
- Stabilized the keyboard reorder browser test by waiting for modal dismissal, focused handle,
  active drag and visible drop target before sending its next key. No application UI changed.

## Actual checks

| Check | Observed result |
| --- | --- |
| Locked backend dependency installation | Success; psycopg/psycopg-binary 3.3.6 |
| SQLite backend suite | **40 passed** |
| PostgreSQL 17.6 backend suite | **38 passed, 2 intentional SQLite-only skips** |
| Ruff lint and format | Passed; 42 Python files formatted |
| Alembic schema comparison | No new operations on SQLite or PostgreSQL |
| Migration downgrade/upgrade | Passed on both databases, including the forms/version cycle |
| Concurrent writes | One save winner/one revision conflict; one version for simultaneous publishes; one complete response for duplicate concurrent submissions |
| Ownership/history/answers/results | Both database suites passed cross-form rejection, immutable snapshots, old labels, false/zero, skips and aggregate denominators |
| Startup seeding | Opt-out stays empty; opt-in adds 3 forms/20 responses; repeat retains edits/counts |
| Real API process restart | Retained 4 forms/21 responses and original retry receipt, including 0 and false |
| PostgreSQL server restart | Existing API connection pool recovered; `/health` returned database ready |
| PostgreSQL dump/restore | Custom-format dump restored into another database; form/response counts and original receipt ID matched |
| Full Playwright suite using PostgreSQL | **23 passed**, including builder, autosave conflicts, preview isolation, all eight public types, retry, results, mobile and accessibility scans |
| Frontend typecheck and lint | Passed |
| Production build | Passed, including standalone asset preparation |
| Render Blueprint | Passed Render's official JSON Schema locally |
| Documentation diagrams | All 3 README/hosting diagrams rendered successfully in Chromium using Mermaid 11.17.2 |

The first full browser run passed 22/23, with a keyboard reorder timing failure. The isolated
test passed; after adding observable state synchronization the complete suite passed 23/23.
The first production build hit Windows `EBUSY` from an older local standalone process. Stopping
that process released the lock and the build passed; the local production frontend was restored.
Existing visual checkpoint images were preserved rather than replacing them with incidental
browser-test captures.

The backend suite emits an upstream Starlette/httpx deprecation warning. Browser test output
includes terminal color warnings and Motion's notice that reduced motion is intentionally enabled.
These notices did not fail the final checks; dependency migrations beyond psycopg were deferred.

PostgreSQL was a disposable portable local installation under ignored `.cache/`, bound to
localhost. Tests used independent generated schemas and a separate `e2e` database. No system
database installation, production database credentials or hosted data were modified.

## Remaining deployment steps

The code is ready for review. Commit/push remain subject to user approval. Follow
[the full setup guide](free-deployment.md) after the approved changes reach the repository:

1. Create a Free Neon project and copy its **direct** PostgreSQL URI with TLS parameters.
2. Create the Free Render backend using `render.yaml` or the guide's manual settings.
3. Enter `DATABASE_URL` in Render, confirm deployment logs and `/health`.
4. Set Vercel's `API_BASE_URL` to the new Render base URL and redeploy the frontend.
5. Verify the hosted save/publish/submit/results flow and persistence after restart/sleep.
6. Put the working production demo URL in the assignment submission.

Provider account verification, real Neon TLS connectivity/role permissions, Render's Docker
build/runtime, cloud cold-start behavior and Vercel proxy requests are not yet observed. Docker's
local daemon was unavailable, so a container build was not run. Free provider quotas and cold
starts apply. A new Neon database does not automatically recover data from an expired Railway
database; retain any available SQLite backup for a separate data transfer.
