# Typeform Builder

An original full-stack Typeform-style builder using Next.js, TypeScript, FastAPI, and SQLite.
The implementation follows the preserved `CLAUDE.md` and `TYPEFORM_BUILD_PROMPT.md`.

**Current milestone: Phase 4 — polished public respondent experience.** The complete
assignment is not finished. No hosted demo exists; the assignment's final submission requires
both a real public repository containing the source and a working hosted demo.

## Available now

| Capability | Status |
| --- | --- |
| Real API-backed workspace, search/layout toggle, create dialog, draft creation | Implemented |
| Responsive builder, inline edits, eight-type picker, settings, reorder, serialized autosave | Implemented |
| Shared renderer registry, searchable dropdown, keyboard/mobile flow, validation, retry | Implemented |
| SQLite models, initial migration, same-form ownership constraints, UTC timestamps | Implemented |
| Immutable publication, anonymous atomic/idempotent submissions, paginated historical results | Implemented |
| Create, rename, duplicate, delete, publish, unpublish, sharing | Implemented |
| Version-scoped summaries | Pending Phase 5 |
| Final published demo forms and stored submissions | Pending Phase 5 |
| Advanced logic/integrations/collaboration/payments/uploads | Outside core scope |
| Optional theme selector/CSV/other bonuses | Deferred until all core requirements pass |

Advanced workflow/integration controls remain disabled and do not simulate successful operations.
The foundation fixtures are real stored drafts and have zero responses. Preview completion does
not submit anything. This is a shared default-creator workspace, not private account auth.

## Prerequisites

- Node.js >=20.9 (verified environment: Node 24.14.1, npm 11.11.0).
- Python 3.11 or newer (verified environment: Python 3.11.6).
- [uv](https://docs.astral.sh/uv/) for the reproducible Python environment.
- Git. Windows commands below use PowerShell.

## Run locally

Backend, from the project root:

```powershell
cd backend
Copy-Item .env.example .env
uv sync --locked --cache-dir ../.cache/uv
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m scripts.seed --foundation
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The seed is explicit and idempotent: three draft forms for visual review, no published forms,
no responses, no destructive reset. Rerunning it preserves existing fixture edits and user
forms. The application does not seed or migrate automatically on startup.

Frontend, in another terminal:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci --cache ../.cache/npm
npm run dev
```

Open http://127.0.0.1:3000/workspace. Backend health is http://127.0.0.1:8000/health and
OpenAPI is http://127.0.0.1:8000/docs. On macOS/Linux use `.venv/bin/python` instead of the
Windows interpreter path. No external font request is required; Inter is bundled locally.

## Configuration

| Variable | Location | Default / purpose |
| --- | --- | --- |
| `DATABASE_URL` | Backend `.env` | `sqlite:///./data/typeform.db`; relative to backend working directory |
| `CORS_ORIGINS` | Backend `.env` | JSON allowlist of local frontend origins |
| `MAX_REQUEST_BYTES` | Backend `.env` | `1048576`, write-request limit |
| `API_BASE_URL` | Frontend `.env.local` | `http://127.0.0.1:8000`, server-only Next.js proxy target |

Keep secrets out of Git and browser-exposed variables. The frontend uses the same-origin
`/api/v1/*` proxy; responses are requested with `no-store`.

## Architecture and API

Frontend route modules delegate to workspace, builder, and player components. TanStack Query
owns server state; local React state/reducers own selection and preview answers. FastAPI routers
call services, Pydantic schemas define contracts, and SQLAlchemy models handle storage.

Tables: `creators`, `forms`, `questions`, `question_options`, `form_versions`, `submissions`,
`answers`. Published snapshots deliberately preserve historical definitions around relational
drafts/submissions. Composite foreign keys prevent cross-form publication/submission references.
See [architecture](docs/architecture.md), [API contracts](docs/api-contracts.md),
[visual references](docs/ui-reference.md), and [phase checklist](docs/acceptance-checklist.md).

Currently available routes:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Database/schema readiness |
| GET | `/api/v1/forms?limit=100&offset=0` | Paginated creator forms and stored counts |
| POST | `/api/v1/forms` | Create an empty persisted draft |
| GET | `/api/v1/forms/{id}` | Draft definition, revision, publication metadata |
| PUT | `/api/v1/forms/{id}/draft` | Atomic ordered draft replacement with revision guard |
| PATCH | `/api/v1/forms/{id}` | Rename with shared revision guard |
| POST | `/api/v1/forms/{id}/duplicate` | New draft, new keys and slug, no responses |
| DELETE | `/api/v1/forms/{id}` | Cascade-delete owned data after UI confirmation |
| POST | `/api/v1/forms/{id}/publish` | Validate and publish immutable snapshot |
| POST | `/api/v1/forms/{id}/unpublish` | Close public collection |
| GET | `/api/v1/public/forms/{slug}` | Anonymous published definition |
| POST | `/api/v1/public/forms/{slug}/responses` | Atomic, validated, idempotent submission |
| GET | `/api/v1/forms/{id}/responses` | Paginated immutable historical answers |
| GET | `/api/v1/forms/{id}/responses/{response_id}` | Historical response detail |

Create request: `{"title":"Customer feedback"}`. Error envelope:

```json
{"error":{"code":"validation_error","message":"Check the supplied values.","details":[{"field":"body.title","message":"Give your form a name"}]}}
```

Request bounds and remaining interfaces are documented in the contracts document. No pending
endpoint reports pretend success.

## Checks and browser screenshots

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest --basetemp ../.cache/pytest-local
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m alembic check
```

```powershell
cd frontend
npm run typecheck
npm run lint
npm run build
$env:PLAYWRIGHT_BROWSERS_PATH = (Join-Path (Resolve-Path ..).Path '.cache/browsers')
npx playwright install chromium
npm run test:e2e
```

Playwright starts isolated services on ports 3001/8001 using `.cache/e2e.db`, never the normal
development database. Test reports/traces are ignored by Git. Browser captures are written to
`.cache/screenshots/current/`, preserving checkpoint captures under `docs/screenshots/phase-1/`.
Exact observed results are recorded in `docs/phase-1-report.md` and `docs/phase-2-report.md`
when the milestone is verified; later phases extend the acceptance suite.

## Deployment and submission boundary

Hosted deployment is outside the authorized build. Phase 6 will supply complete deployment
instructions. The intended topology is Next.js plus one FastAPI backend instance with SQLite
on a durable mounted volume, explicit migrations, health checks, and environment configuration.
Ephemeral/serverless SQLite storage does not meet the persistence requirement.

Local Git is connected to https://github.com/Gupta2708/Typeform-clone.git. No commit or push is
performed without the user's authorization. Phase commits are authorized; pushing is pending.
An empty remote alone is not a completed public-source
submission, and local preview URLs are not hosted demo links.
