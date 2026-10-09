# Phase 1 checkpoint — 9 October 2026

## Delivered

- Next.js/React/TypeScript/Tailwind frontend and FastAPI/Pydantic/SQLAlchemy/Alembic backend;
  npm and uv lockfiles, environment examples, Git exclusions, and modular source directories.
- Actual inspected Typeform builder/preview/results screenshots and reference limitations.
  Central CSS tokens, locally bundled OFL-licensed Inter, and a consistent Lucide icon family.
- API-backed workspace, accessible create dialog, persistent empty draft creation, builder
  layout/selection/settings, all eight preview widget foundations, full-screen/mobile preview.
- Seven relational tables, unique ordering/attempt/answer constraints, composite same-form
  version foreign keys, per-connection foreign-key enforcement, and UTC serialization.
- Explicit idempotent draft fixture seeding. No seeded publications, submissions, fake counts,
  or automatic normal-startup reset/seed.
- Repository-local author identity and supplied remote connection. Remote returned no refs;
  nothing has been pushed.

## Observed checks

| Check | Result |
| --- | --- |
| Frontend `npm run typecheck` | Passed |
| Frontend `npm run lint` | Passed, zero warnings |
| Frontend `npm run build` | Passed, production routes generated |
| Backend pytest | 12 passed |
| Ruff lint / format check | Passed |
| Alembic upgrade/current/check | At head, no model/migration drift |
| Migration downgrade/re-upgrade with published pointer | Passed in isolated test DB |
| Live `/health` on port 8000 | 200, database ready |
| Playwright foundation suite | 4 passed |
| Browser widths 1440 / 1280 / 768 / 390 | Reviewed; no horizontal overflow in tested layouts |
| Original instruction SHA-256 hashes | Unchanged |

Browser tests verified create/search/layout/reload, dialog Escape/focus restoration, builder
selection, preview answer preservation, preview completion with unchanged stored counts, and
narrow-screen access to all builder panels. The isolated browser database retains its own
test-created drafts; its screenshots may show a different total from the three-draft local DB.

## Browser captures

- [Workspace](screenshots/phase-1/workspace-desktop.png)
- [Builder with choice question/settings](screenshots/phase-1/builder-desktop.png)
- [Desktop text preview](screenshots/phase-1/player-desktop-text.png)
- [Desktop choice preview](screenshots/phase-1/player-desktop-choice.png)
- [Mobile builder](screenshots/phase-1/builder-mobile.png)
- [Mobile player preview](screenshots/phase-1/player-mobile.png)

The workspace and builder use compact neutral chrome; player inputs have generous typography
and whitespace. Actual screenshots were opened and inspected, rather than inferred from test
success. Question picker/editing fidelity remains the Phase 3 visual gate.

## Limitations and next work

This is a foundation, not the finished assignment. Persisted question editing, serialized
autosave/conflict resolution, publication, anonymous submissions, complete keyboard/type
validation, full CRUD, and historical results are next. Disabled controls do not pretend these
features exist. No hosted demo or source push has been performed.

The locked Next.js lint plugins currently accept ESLint 9, not ESLint 10; the compatible 9.39.5
release emits an upstream deprecation notice at install time. Peer-dependency inspection is
clean and lint works. Starlette's test client emits an upstream httpx deprecation warning;
the 12 tests pass. Neither warning is silently presented as an application test failure.

Commit: `chore: scaffold applications and visual foundations`.
Author/committer: `Gupta2708 <guptavaibhav2708@gmail.com>`; no AI attribution trailers.
