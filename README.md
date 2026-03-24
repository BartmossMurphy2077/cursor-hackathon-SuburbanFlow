# Cursor Hackathon · IE University · March 2026

**Organized by TechIE x Building and Tech · Sponsored by Cursor**

## 1. Overview

This repository is your starting point for the hackathon.

Your flow is simple.

1. Clone this repo
2. Build your project during the event
3. Deploy it on Vercel
4. Submit it through the Google Form
5. Present it live

This repo is here to help you move quickly from idea to deployment.

## 2. The Challenge

**Make one person’s hard day easier.**

This challenge is intentionally open to interpretation.

You are not being asked to build one specific type of product. You are being asked to identify a real person, understand what makes their day difficult, and build something that helps in a meaningful way.

The strongest projects will be grounded in a real situation, focused in scope, and clear in their usefulness.

Read the full brief and rubric in [CHALLENGE.md](./CHALLENGE.md).

## 3. Who Can Participate

1. Solo participants or teams of up to 4
2. No technical background required
3. All participants receive Cursor credits

You do not need to be an experienced developer to participate. If you can clearly describe what should exist, you can use this hackathon to build it.

## 4. Rules

1. Your project must be built during the event
2. Your project must be deployed on Vercel
3. Your final submission must include a live link
4. Teams may have up to 4 people
5. Solo participation is allowed

## 5. Evaluation Rubric

Projects will be evaluated based on the rubric in [CHALLENGE.md](./CHALLENGE.md), with particular attention to the following areas:

1. Understanding of the person and problem
2. Relevance and usefulness
3. Quality of execution
4. Creativity and interpretation
5. Use of tools to extend what was possible
6. Presentation and storytelling

## 6. AgentCanvas MVP Architecture

This repository now includes an MVP implementation path for AgentCanvas that fits hackathon constraints:

- Vercel-compatible API entrypoint via `api/index.py`
- FastAPI runtime and typed contracts with Pydantic in `backend_or_api/app/`
- SSE event stream for live node progress and token chunks
- Minimal DAG executor with parallel execution for independent node layers
- JSON schema artifact for run payload in `schemas/run_request.schema.json`

The event contract used by the UI is:

- `node_start`
- `token_chunk`
- `node_complete`
- `node_error`
- `run_complete`

This keeps the frontend transport-agnostic and compatible with a later migration to full FastAPI + Docker + optional WebSockets.

## 7. Local Development

### 7.1 Run with Python

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend_or_api/requirements.txt
uvicorn backend_or_api.app.main:app --reload
```

Without `DATABASE_URL`, the API uses a local SQLite file `agentcanvas.db` in the current working directory. On startup the API runs **Alembic migrations** (`alembic.ini` at the repo root). If you previously used an older schema, delete `agentcanvas.db` once or run migrations manually (see §7.4).

For PostgreSQL locally, set:

`DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/DBNAME`

**Authentication (recommended):**

1. `POST /auth/register` with `{"email":"you@example.com","password":"atleast8chars"}` (or `POST /auth/login`).
2. Send `Authorization: Bearer <access_token>` on all sandbox and run routes.

**Local convenience:** set `AUTH_DISABLED=1` to auto-provision a dev user and skip bearer tokens (do **not** use in production).

**Secrets:** set `JWT_SECRET` to a long random string in production (and on Vercel). Optional: `JWT_EXPIRE_MINUTES` (default: 10080 = 7 days).

Open [http://localhost:8000](http://localhost:8000).

### 7.2 Run with Docker

```bash
docker compose up --build
```

Open [http://localhost:8000](http://localhost:8000).

### 7.3 API Endpoints

Unless `AUTH_DISABLED=1`, protected routes expect:

`Authorization: Bearer <token>`

(`POST /auth/register`, `POST /auth/login`, `GET /health`, and `GET /` are public.)

**Auth**

- `POST /auth/register` — body: `email`, `password` (min 8 chars); returns `{ access_token, token_type }`
- `POST /auth/login` — same shape; returns token

**Sandboxes** (scoped to the authenticated user)

- `POST /sandboxes` — create sandbox (JSON body: `name`, optional `description`)
- `GET /sandboxes` — list **your** sandboxes
- `GET /sandboxes/{sandbox_id}` — sandbox metadata (403 if not yours)
- `PATCH /sandboxes/{sandbox_id}` — update `name` / `description`
- `DELETE /sandboxes/{sandbox_id}` — delete sandbox, projection rows, and its runs
- `GET /sandboxes/{sandbox_id}/graph` — load saved `PipelineGraph`
- `PATCH /sandboxes/{sandbox_id}/graph` — save canvas (`PipelineGraph` body); validates DAG; keeps normalized **node/edge** projection in sync
- `GET /sandboxes/{sandbox_id}/nodes` — queryable mirror: `node_id`, `kind` (`agent` | `collector`)
- `GET /sandboxes/{sandbox_id}/edges` — queryable mirror: `source_id`, `target_id`
- `GET /sandboxes/{sandbox_id}/runs` — list run history for that sandbox

**Runs**

- `POST /runs` — same `RunRequest` as before; graph is validated before enqueue. Returns `run_id`.
- `POST /runs/{run_id}/resume` — **only if status is `failed`**; continues from **saved node outputs** using the **current sandbox graph** and optional body `{ "prompt": "override" }`. Same `run_id` and SSE channel as the original run.
- `GET /runs/{run_id}/events` — SSE. Browsers’ `EventSource` cannot set headers; use **`?access_token=<jwt>`** (or enable `AUTH_DISABLED=1` for local demos).
- `GET /runs/{run_id}` returns run snapshot (includes optional `collector_output`)

**Health**

- `GET /health` returns service status

### 7.4 Database Schema

The API persists all data to PostgreSQL (or SQLite for local dev). Tables are managed by Alembic migrations.

| Table | Purpose | Key columns |
|-------|---------|-------------|
| **`app_user`** | User accounts | `id`, `email` (unique), `hashed_password`, `created_at` |
| **`sandbox`** | Projects / workspaces | `id`, `name`, `description`, `owner_user_id` → `app_user.id`, `canvas_state` (JSON — full `PipelineGraph`), `created_at`, `updated_at` |
| **`sandboxnode`** | Queryable mirror of nodes in `canvas_state` | `sandbox_id` → `sandbox.id`, `node_id`, `kind` (`agent` \| `collector`), `data` (JSON) |
| **`sandboxedge`** | Queryable mirror of edges in `canvas_state` | `sandbox_id` → `sandbox.id`, `source_id`, `target_id` |
| **`runrecord`** | One row per pipeline execution | `run_id`, `sandbox_id` → `sandbox.id`, `status`, `prompt`, `error`, `collector_output` (JSON), `created_at`, `completed_at` |
| **`runnodeoutput`** | One row per completed node in a run | `run_id` → `runrecord.run_id`, `node_id`, `output` (JSON) |

**Which endpoints write to which tables:**

| Endpoint | Reads | Writes |
|----------|-------|--------|
| `POST /auth/register` | `app_user` | `app_user` |
| `POST /auth/login` | `app_user` | — |
| `POST /sandboxes` | — | `sandbox`, `sandboxnode`, `sandboxedge` |
| `GET /sandboxes` | `sandbox` | — |
| `GET /sandboxes/{id}` | `sandbox` | — |
| `PATCH /sandboxes/{id}` | `sandbox` | `sandbox` |
| `DELETE /sandboxes/{id}` | all tables | deletes from `runnodeoutput`, `runrecord`, `sandboxnode`, `sandboxedge`, `sandbox` |
| `GET /sandboxes/{id}/graph` | `sandbox` | — |
| `PATCH /sandboxes/{id}/graph` | `sandbox` | `sandbox`, `sandboxnode`, `sandboxedge` (rebuilt) |
| `GET /sandboxes/{id}/nodes` | `sandboxnode` | — |
| `GET /sandboxes/{id}/edges` | `sandboxedge` | — |
| `GET /sandboxes/{id}/runs` | `runrecord` | — |
| `POST /runs` | `sandbox` | `runrecord`, `runnodeoutput` (as nodes complete) |
| `POST /runs/{id}/resume` | `runrecord`, `runnodeoutput`, `sandbox` | `runrecord`, `runnodeoutput` |
| `GET /runs/{id}` | `runrecord`, `runnodeoutput` | — |
| `GET /runs/{id}/events` | `runrecord` (permission check) | — (live stream is in-memory) |

### 7.5 Migrations (Alembic)

From the **repository root**:

```bash
python -m alembic current
python -m alembic upgrade head
```

The app also runs `upgrade head` on startup. To add a schema change later: `python -m alembic revision --autogenerate -m "describe"` then commit the new file under `backend_or_api/alembic/versions/`.

### 7.6 Running the Integration Test

With the server running (`AUTH_DISABLED=1`):

```bash
python _integration_test.py
```

This exercises: health, sandbox CRUD, graph save/load, node/edge projection, run lifecycle, cascade delete.

## 8. Deploy to Vercel

The repository includes `vercel.json` and `api/index.py` for Vercel deployment:

```bash
npx vercel
```

If needed, set the project framework to "Other" and ensure Python serverless support is enabled.

For a **hosted database** (e.g. Vercel Postgres, Neon, Supabase, or Railway Postgres), add Vercel environment variables:

- `DATABASE_URL` — connection string (`postgresql://…` is accepted; the app normalizes it for the `psycopg` driver).
- `JWT_SECRET` — long random string (required for real auth).
- Optionally set `AUTH_DISABLED` **unset** or `0` so sandboxes require login.

Ensure the deployment includes **`alembic.ini`** and **`backend_or_api/alembic/`** (the default Git-based Vercel setup does). Without `DATABASE_URL`, SQLite on Vercel does **not** persist across invocations—use Postgres for real demos.

## 9. How to Use This Repo

### 9.1 Clone the repository

```bash
git clone <YOUR_REPO_URL>
cd <YOUR_REPO_NAME>
```

### 9.2 Build your project

Use this starter however you want. You can adapt it, replace it, or extend it to match your idea.

Your goal is to create a project that clearly demonstrates your solution and can be accessed through a live URL.

### 9.3 Run locally

Use either Python or Docker instructions from sections above.

### 9.4 Deploy to Vercel

Your final project must be live on Vercel.

A typical deployment flow looks like this:

```bash
npx vercel
```

You can also connect your GitHub repository directly to Vercel and deploy from there.

Before submitting, make sure the deployment link works, the project loads correctly, and the core functionality is accessible to judges.

## 10. Submission

Once your project is deployed, submit it through the Google Form:

**[Submit here](https://forms.gle/dS1H98eJoZwsXj7e7).**

Your submission should include the following:

1. Team name
2. Team members
3. Project title
4. Short description
5. Deployed Vercel link

Only submitted projects with a working deployed link will be considered.

## 11. Presentation

After submitting, your team will present the project live.

Your presentation should clearly communicate four things:

1. Who you built for
2. What problem you identified
3. What you built
4. Why your solution makes that person’s day easier

This is not only about showing features. It is also about showing your reasoning, your interpretation of the challenge, and the story behind the project.

## 12. Included Resources

1. [Challenge brief and rubric](./CHALLENGE.md)
2. [Practical tips](./resources/tips.md)
3. [Architecture and implementation idea](./IDEA.md)

## 13. Final Reminder

Build something focused.

Deploy it.

Submit the live link.

Then tell the story of why it matters.