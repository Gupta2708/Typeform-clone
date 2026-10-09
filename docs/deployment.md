# Durable deployment and submission guide

Hosted deployment is outside this build. The public repository is verified at Phase 5
(`e6144f4`); the final Phase 6 commit still needs an authorized push. No hosted demo is verified.
Compose configuration validates; Docker's daemon was unavailable locally, so container builds
and execution remain unverified. Complete the smoke checklist after deploying.

## Topology

Use a Linux VM with Docker Engine/Compose, one FastAPI instance, persistent SQLite, Next.js
and Caddy. Browser requests share the frontend origin; Next proxies `/api/v1` privately.
Backend ports and the database are not exposed externally.

The named `sqlite_data` volume mounts `/data`; `DATABASE_URL=sqlite:////data/typeform.db`.
Keep it across redeploys. An ephemeral/serverless filesystem does not provide persistence.
Multiple backend replicas sharing SQLite are outside this design. Creator access is a shared
editable workspace because private authentication is outside the core scope.

## Docker Compose

From the project root on a machine with a running Docker daemon:

```bash
docker compose config --quiet
docker compose up --build -d
docker compose exec backend python -m scripts.seed --demo
docker compose ps
curl --fail http://127.0.0.1:3000/api/v1/forms
```

Open `http://127.0.0.1:3000/workspace`. The explicit container entrypoint migrates the mounted
database before serving one worker. Seeding is a separate manual command; it never resets
data. Frontend waits for [backend service_healthy](https://docs.docker.com/compose/how-tos/startup-order/).
Its standalone server includes fonts/static assets and its build-time rewrite points at
`http://backend:8000`. Dependency installations use lockfiles.

For public hosting, point a domain's DNS A/AAAA records at the VM and allow TCP 80/443
(optionally UDP 443 for HTTP/3). Copy `.env.compose.example` to root `.env`, set `APP_DOMAIN`
to the actual hostname, then:

```bash
docker compose --profile hosting up --build -d
docker compose exec backend python -m scripts.seed --demo
docker compose logs --tail=100 gateway backend frontend
curl --fail https://YOUR_DOMAIN/api/v1/forms
```

[Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https) requires working DNS and
reachable challenge ports. Certificate data/config use persistent volumes. Local `.env` is
ignored. Public example: `https://YOUR_DOMAIN/to/demo-experience`; creator:
`https://YOUR_DOMAIN/workspace`. Replace these placeholders with observed working submission URLs.

Redeploy using the same Compose project/volumes with `docker compose up --build -d`.
Do not remove `sqlite_data` or use `docker compose down -v` when retaining data.

## Separate services or standalone installation

Confirm the hosting provider supports a durable runtime mount and one backend instance.
For example, [Railway's volume reference](https://docs.railway.com/volumes/reference) describes
runtime-mounted persistent volumes: migrate after the mount, not during image build.
No Railway deployment was performed here.

Backend, with `backend/` as working directory:

```bash
uv sync --locked --no-dev
export DATABASE_URL=sqlite:////data/typeform.db
export CORS_ORIGINS='[]'
.venv/bin/python -m scripts.start_server
```

The entrypoint applies migrations and serves uvicorn on `0.0.0.0:${PORT:-8000}` with one worker.
Its mount must be writable. Seed once from a runtime shell using
`.venv/bin/python -m scripts.seed --demo`. Normal uvicorn requires manual `alembic upgrade head`
beforehand. `/health` must return 200 before routing traffic.

Frontend, in `frontend/`:

```bash
npm ci
export API_BASE_URL=https://YOUR_BACKEND_HOST
npm run build
export HOSTNAME=0.0.0.0
export PORT=3000
npm start
```

Set `API_BASE_URL` **before building**; changing only runtime configuration does not change
Next's rewrite. Browsers use same-origin API requests, so no public API environment variable
is needed. Direct cross-origin clients require explicit `CORS_ORIGINS`, not a wildcard.
Deploy standalone output with copied assets together, using the Dockerfile or Node build/start
commands. Configure process supervision and TLS for both public services.

## Consistent backup and restore

From `backend/`, the SQLite backup API includes committed journal/WAL content, checks integrity
and refuses to overwrite destinations:

```bash
.venv/bin/python -m scripts.backup_db ../backups/typeform-2026-10-09.db
```

PowerShell uses `.\.venv\Scripts\python.exe`. With Compose:

```bash
docker compose exec backend python -m scripts.backup_db /data/typeform-backup.db
docker compose cp backend:/data/typeform-backup.db ./typeform-backup.db
```

Choose a new name per backup and copy it off-volume. A plain copy of a live SQLite file can
omit journal content. Tests open the backup and verify integrity/foreign keys and original
data after deletion from the live database.

Restore with the backend stopped. Retain the current database/sidecars as an archive; copy
the backup to a **new directory**, point `DATABASE_URL` there and restart. This avoids mixing
old `-wal`/`-shm` files with restored data. Verify health/counts before switching traffic.
For Compose, prepare a new named volume with the restored file, update the mount and recreate
backend. Retain the old volume until restored data is verified. These are recovery instructions,
not evidence of a hosted restore drill.

## Hosted smoke checklist

- [x] Public repository contains Phase 1–5 source, both instruction files and lockfiles.
- [ ] Final Phase 6 source and handoff are pushed to the public repository.
- [ ] HTTPS workspace and bundled fonts/static assets load.
- [ ] Health passes, migrations are at head and SQLite is on the durable mount.
- [ ] Seed has two published forms, one draft and twenty valid stored responses.
- [ ] Create/edit/reorder/save/reload/publish works through the frontend proxy.
- [ ] Anonymous submission appears in Results with immutable historical labels.
- [ ] Preview creates no response; unpublish closes public collection.
- [ ] Restart/redeploy retains drafts/responses with the same volume.
- [ ] Off-volume backup and isolated restore are verified.
- [ ] Actual public repository and hosted demo links appear in the assignment submission.

Pushing requires separate authorization. When authorized/authenticated, check `git ls-remote origin`
again, integrate any unexpected remote work safely, then push `main`. Never store credentials
in source or remote URLs.
