# Typeform Builder

An original Typeform-style builder and conversational public player using Next.js, TypeScript,
FastAPI and SQLite. Both supplied instruction files are preserved. All six local implementation
phases are complete; evidence is in the [verification report](docs/phase-6-report.md).

**Final assignment submission requires current source in a real public repository and a working
hosted demo.** [The public repository](https://github.com/Gupta2708/Typeform-clone) is verified
at the Phase 5 commit `e6144f4`. Phase 6 remains local pending authorized push. No hosted demo
is verified; hosted deployment is outside this build.

## Features

| Experience         | Implemented                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Workspace          | Real counts, search/pagination, grid/list, create, rename, duplicate, explicit delete, unpublish          |
| Builder            | Inline editing, all eight types, required/options/bounds/rating settings, pointer/keyboard reorder        |
| Saving/publication | Serialized autosave, retry, conflict/download/discard confirmation, immutable versions, stable share link |
| Preview            | Shared widgets, interactive canvas, desktop/mobile full-screen preview; no stored responses               |
| Public player      | One question at a time, keyboard/Back/progress, motion, searchable dropdown, validation, safe retry       |
| Results            | Paginated responses, immutable historical detail, version-scoped counts/distributions/statistics          |
| Demo               | Two published mixed-type forms with ten valid responses each, one draft, optional skips and false/0       |
| Settings           | Neutral design surface and editable thank-you content                                                     |

All eight types work: short/long text, multiple choice, dropdown, email, number, yes/no, rating.
Workflow/Connect open honest Coming soon dialogs. Additional themes and bonuses remain deferred.
This is a **shared default-creator workspace**, without private account authentication.

## Local setup

Prerequisites: Node >=20.9, Python >=3.11, [uv](https://docs.astral.sh/uv/) and Git.
Verified with Node 24.14.1/npm 11.11.0 and Python 3.11.6. Commands use PowerShell;
on Linux/macOS replace `.venv\Scripts\python.exe` with `.venv/bin/python`.

From the project root:

```powershell
cd backend
Copy-Item .env.example .env
uv sync --locked --cache-dir ../.cache/uv
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m scripts.seed --demo
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci --cache ../.cache/npm
npm run dev
```

Open [workspace](http://127.0.0.1:3000/workspace), [health](http://127.0.0.1:8000/health)
or [API docs](http://127.0.0.1:8000/docs). Fonts are bundled. Do not overwrite an existing
environment file when repeating setup.

For the production frontend, keep the backend running and stop the development frontend:

```powershell
cd frontend
npm run build
$env:HOSTNAME = '127.0.0.1'
$env:PORT = '3000'
npm start
```

The build prepares standalone output with static assets/fonts. `API_BASE_URL` is baked into
the rewrite at build time; rebuild when changing it.

## Demo walkthrough

1. Open Customer experience. Edit a title inline, change settings and reorder questions.
   Watch the accurate save indicator, then reload to verify persistence.
2. Try live/full-screen preview. Completion adds no response.
3. Publish edits, copy the stable link and open it in a private browser. Enter answers,
   use Enter/Back and submit. Server success displays thank-you.
4. Open Results, inspect detail and switch summary versions. Draft changes do not relabel
   historical answers.
5. Community event demonstrates dropdown, number, yes/no and long text. Product discovery
   is a draft. Direct examples: `/to/demo-experience` and `/to/demo-event`.

`scripts.seed --demo` is explicit and idempotent: a fresh database gets two published forms
with exactly ten responses each and one draft. Reruns preserve edits and user records;
new local responses naturally increase counts. `--foundation` separately creates the three
original visual drafts. Normal application startup never seeds or creates tables.

## Configuration and architecture

| Variable            | Location             | Purpose                                                               |
| ------------------- | -------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`      | Backend `.env`       | `sqlite:///./data/typeform.db`, relative to backend working directory |
| `CORS_ORIGINS`      | Backend `.env`       | Explicit JSON allowlist; `[]` with same-origin proxy                  |
| `MAX_REQUEST_BYTES` | Backend `.env`       | Default 1048576; bounded write payloads                               |
| `API_BASE_URL`      | Frontend environment | Server-only rewrite target, set before production build               |
| `PORT`, `HOSTNAME`  | Frontend runtime     | Standalone listener; default 3000 / 0.0.0.0                           |

Thin Next.js routes delegate to separate UI modules. TanStack Query owns server state;
a serialized draft store and player reducer own local state. FastAPI routes call services,
Pydantic defines contracts and SQLAlchemy/Alembic persist seven tables around immutable
snapshots. Revision guards, same-form foreign keys and atomic/idempotent submissions protect data.

See [architecture/schema/tradeoffs](docs/architecture.md), [API contracts](docs/api-contracts.md),
[official visual references](docs/ui-reference.md), [phase checklist](docs/acceptance-checklist.md)
and [durable deployment guide](docs/deployment.md).

`/api/v1` includes form list/create/read/rename/delete/duplicate, aggregate draft save,
publish/unpublish, anonymous published read/submit, responses/detail and version-scoped summary.
`/health` reports database readiness; `/docs` exposes request schemas. Optional unanswered
values are omitted; false and zero remain valid.

## Verification

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

Playwright starts isolated services on 3001/8001 using `.cache/e2e.db` and `.next-e2e`, preserving
the normal database/production build. It covers autosave races/conflicts/discard, preview
isolation, lost acknowledgements/retry, keyboard interactions, historical results, accessibility,
four viewport widths, long content and actual 200% browser zoom. Checkpoint screenshots live
under `docs/screenshots/`; repeated phase 3–5 captures default to `.cache/screenshots/current/`.
See the [final report](docs/phase-6-report.md) for observed results and unverified surfaces.

## Deployment and submission

[Deployment instructions](docs/deployment.md) include Compose/Caddy, standalone commands,
durable volumes, backups/restores and a hosted smoke checklist. Compose configuration validates;
container execution and hosted deployment remain unverified. Use a persistent SQLite mount
with one backend instance.

Phase commits use repository-local `Gupta2708 <guptavaibhav2708@gmail.com>` for author and
committer, with no AI co-author trailers. Pushing requires separate authorization. A configured
remote and local URLs do not satisfy public-source and hosted-demo submission requirements.
