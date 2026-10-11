# Free deployment: Vercel + Render + Neon

This setup keeps forms and responses in **Neon PostgreSQL**, outside Render's temporary
filesystem. SQLite remains the default for local development and existing Compose deployments.
The configuration and local PostgreSQL workflows are verified; no hosted deployment is claimed.

```mermaid
flowchart LR
    B[Browser] --> V[Vercel: Next.js frontend]
    V -->|Same-origin /api/v1 proxy| R[Render Free: FastAPI]
    R -->|TLS connection| N[(Neon Free: PostgreSQL)]
    R -. Sleep or redeploy .-> R
    N -->|Forms, immutable versions and responses remain| N
```

## Before you begin

Use GitHub repository `Gupta2708/Typeform-clone` with the PostgreSQL changes on `main`.
You need accounts on all three providers. Select each provider's free plan; verify any account
verification or usage conditions shown in its dashboard before provisioning.

This is a hobby/demo deployment within provider quotas, with cold starts rather than an uptime
guarantee. Render Free sleeps after 15 idle minutes and may take about a minute to wake. It has
750 instance hours per workspace per month, plus bandwidth/build limits. Its local filesystem
is temporary; **do not put the hosted database in `/data/typeform.db`**.
[Render Free limitations](https://render.com/docs/free)

Use Neon rather than Render's free PostgreSQL offering, which expires after 30 days.
Neon's free plan has resource limits: monitor them in its dashboard.
[Neon free plan](https://neon.com/blog/neon-free-plan-1-gb-per-project)

The creator workspace remains shared and editable without private accounts. Use sample data for
the assignment demo. A fresh Neon database does **not** automatically import an old Railway
database: keep any available SQLite backup; existing data transfer is a separate operation.

## 1. Create the Neon database

1. Sign into [Neon](https://console.neon.tech/) and create a project on **Free**.
2. Name it `typeform-clone`. Pick a supported PostgreSQL version (17 is verified locally) and
   a region near your Render service. Keep the default database/role or create dedicated ones.
3. Click **Connect**, select the intended project branch/database/role and turn **connection
   pooling off**. Copy the **direct** connection string. Its hostname must not contain `-pooler`.

It should look like this, with your actual generated credentials:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@ep-YOUR-HOST.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

Paste the URI into Render's private environment-variable field. Keep it out of source control,
screenshots and frontend configuration. Preserve the generated TLS parameters and encoded
password. The app accepts `postgresql://`, `postgres://` and `postgresql+psycopg://` and selects
the installed psycopg 3 driver automatically.

Use the direct endpoint for this small app because startup also performs Alembic migrations.
The backend limits its own pool to two connections with two overflow connections and checks
connections before reuse. Direct URLs also work with `pg_dump`/`pg_restore`.
[Neon connection pooling](https://neon.com/docs/connect/connection-pooling)

## 2. Deploy the Render backend

### Option A: repository Blueprint

In [Render](https://dashboard.render.com/), select **New → Blueprint** and connect
`Gupta2708/Typeform-clone`, branch `main`. Render reads root [render.yaml](../render.yaml).
It creates a **Free** Docker web service named `typeform-api` using `backend/`.
Enter Neon's direct connection string when prompted for `DATABASE_URL` and confirm the
provisioned service is Free. No Render database or persistent disk is needed.
[Blueprint reference](https://render.com/docs/blueprint-spec)

### Option B: manual Web Service

Select **New → Web Service**, connect the repository, then set:

| Setting | Value |
| --- | --- |
| Name | `typeform-api` or an available name |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Docker |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` |
| Docker Command | Leave blank: use the Dockerfile's startup command |
| Instance Type | **Free** |
| Health Check Path | `/health` |

Root-directory settings make Docker paths relative to `backend/`.
[Monorepo settings](https://render.com/docs/monorepo-support)

Add environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Your **direct Neon URI** with TLS parameters |
| `CORS_ORIGINS` | `[]` |
| `MAX_REQUEST_BYTES` | `1048576` |
| `SEED_DEMO` | `true` for the assignment demo; `false` for an empty workspace |

Let Render supply `PORT`. Do not add a custom build command, pre-deploy migration, SQLite
volume or the previous shell command that seeded an ephemeral SQLite database.

Click **Deploy Web Service**. The Docker build installs locked dependencies. Startup applies
migrations, optionally inserts only missing demo forms, then serves one uvicorn worker on
Render's port. `SEED_DEMO=true` preserves edits and response counts on subsequent starts.
For a fresh database it creates two published forms with ten responses each and one draft.

Open your actual backend address:

```text
https://YOUR-BACKEND.onrender.com/health
```

Expected JSON:

```json
{"status":"ok","database":"ready"}
```

If startup fails, read Render's deployment logs. Confirm the URI is PostgreSQL, the Neon project
is active, its credentials are current and TLS parameters are intact. Free Render has no runtime
shell; initialization is already handled by the application entrypoint.

## 3. Connect or create the Vercel frontend

If your frontend is already deployed on Vercel, edit its `API_BASE_URL` to the new Render URL
and **redeploy**. Otherwise select **Add New → Project**, import the same repository and set:

| Setting | Value |
| --- | --- |
| Plan | Hobby, for eligible personal/noncommercial use |
| Framework Preset | Next.js |
| Root Directory | `frontend` |
| Install Command | `npm ci` |
| Build Command | `npx next build` |
| Output Directory | Leave the Next.js framework default |
| Node.js | `24.x` |
| Production Branch | `main` |

[Vercel Hobby](https://vercel.com/docs/plans/hobby),
[monorepo root directory](https://vercel.com/docs/monorepos),
[Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

Before deploying, set this variable for **Production** (and Preview if desired):

```dotenv
API_BASE_URL=https://YOUR-BACKEND.onrender.com
```

Use the backend base URL without a trailing slash or `/api/v1`. Do not set `DATABASE_URL` on
Vercel or use a `NEXT_PUBLIC_` database variable. The existing Next.js rewrite proxies browser
requests to the backend, so browsers continue to use the Vercel origin. `CORS_ORIGINS=[]` is
appropriate for this path; direct cross-origin browser API clients need explicitly allowed origins.

Changing `API_BASE_URL` requires a new frontend build. Environment changes do not update an
existing deployment. A Preview pointing at the same backend shares the production demo data;
use a separate backend/database for isolated preview environments.
[Vercel environment variables](https://vercel.com/docs/environment-variables)

## 4. Check the hosted result

Replace placeholders with the actual production domain, open in an incognito window and check:

```text
https://YOUR-FRONTEND.vercel.app/
https://YOUR-FRONTEND.vercel.app/workspace
https://YOUR-FRONTEND.vercel.app/api/v1/forms
https://YOUR-FRONTEND.vercel.app/to/demo-experience
https://YOUR-FRONTEND.vercel.app/to/demo-event
```

- [ ] Fonts/images and the workspace load without errors.
- [ ] Initial seed has three forms, two published, and twenty responses.
- [ ] Create/edit/autosave/reload retains the draft.
- [ ] Publish, anonymously submit, and find the response in Results.
- [ ] Preview stores no response; historical labels remain after editing and republishing.
- [ ] Restart/redeploy Render, then confirm your extra form and response still exist.
- [ ] Allow the backend to sleep; open its `/health` first, wait for it to wake, then retry the app.
- [ ] Verify the public production link works without Vercel login/protection.
- [ ] Submit the public repository and actual working Vercel demo link.

The backend health URL is `/health`; the frontend only proxies `/api/v1`, so checking the
frontend's `/health` is not a backend health check. Cold-start errors can affect the first proxied
request; wake the backend and retry rather than creating another database.

## 5. Back up PostgreSQL

Install PostgreSQL client tools matching or newer than your Neon server. Run a custom-format
dump locally, using the **direct** URL kept in your shell environment (not checked into a file):

```powershell
pg_dump --dbname="$env:DATABASE_URL" --format=custom --no-owner --no-privileges --file=typeform-backup.dump
```

Keep that backup outside Render and Git. Restore into a **new empty** database using its direct
URI in `RESTORE_DATABASE_URL`:

```powershell
pg_restore --dbname="$env:RESTORE_DATABASE_URL" --no-owner --no-privileges --exit-on-error typeform-backup.dump
```

Verify restored counts/history before pointing the backend at it. Do not run `scripts.backup_db`
against PostgreSQL: that script intentionally remains SQLite-only. Neon/provider restore windows
are subject to their plan limits; an independent dump is useful for recovery.
[PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)

## Local PostgreSQL verification

Keep normal local setup unchanged for SQLite. To run the backend suite against PostgreSQL,
set `TEST_DATABASE_URL` to a disposable **direct** database URI and run pytest from `backend/`.
Each test creates and removes a unique schema; the role needs schema-creation privileges.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:5432/typeform_test'
.\.venv\Scripts\python.exe -m pytest
```

For browser tests, create a separate database whose name includes `e2e`, then run from `frontend/`:

```powershell
$env:E2E_DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:5432/typeform_e2e'
npm run test:e2e
```

The browser runner seeds this database and its workflows mutate it. Never use the hosted
production URI for either test command. Remove the test environment variables to return to SQLite.
See [the PostgreSQL verification report](postgresql-report.md) for actual observed checks.
