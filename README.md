# AgentCanvas

A visual, sandbox-based multi-agent orchestration platform for the web. Users build AI pipelines by dragging agent nodes onto an infinite canvas, wiring them together, and running the graph. Each agent can use a different LLM provider (OpenAI or Anthropic), and outputs flow between nodes automatically. A collector node synthesizes everything into a final report.

---

## Table of contents

1. [How it works](#how-it-works)
2. [Architecture](#architecture)
3. [Tech stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Getting started](#getting-started)
6. [Environment variables](#environment-variables)
7. [Running with Docker (recommended)](#running-with-docker-recommended)
8. [Running without Docker](#running-without-docker)
9. [API reference](#api-reference)
10. [SSE event protocol](#sse-event-protocol)
11. [Project structure](#project-structure)
12. [Testing](#testing)
13. [How the DAG executor works](#how-the-dag-executor-works)
14. [LLM judge nodes](#llm-judge-nodes)

---

## How it works

1. **Create a sandbox.** Name your workspace and optionally set global context (shared variables all agents can access).
2. **Drag agents onto the canvas.** Each agent node has a name, a system prompt (role), a model provider (ChatGPT or Claude), a specific model, and a temperature setting. Templates for common roles (Researcher, Writer, Critic) are provided in the sidebar palette.
3. **Wire agents together.** Draw directed edges from one agent's output port to another's input port. The graph must be a DAG (no cycles). Connect at least one agent to the Collector.
4. **Run the pipeline.** Hit "Run pipeline" or press `Ctrl+Enter`. The backend resolves the topological order of the graph, executes independent branches in parallel, streams token-by-token output back to the canvas via Server-Sent Events, and finally runs the Collector to produce a synthesized result.
5. **Review results.** Click any agent node to see its output in the Inspector panel. Click the Collector to see the final merged report rendered as readable text.

---

## Architecture

```
Browser (React + ReactFlow + Zustand)
  |
  |  POST /runs  ──>  FastAPI backend
  |  GET  /runs/{id}/events  ──>  SSE stream
  |
  v
FastAPI (Python 3.12, async)
  |
  ├── DAG executor (topological sort + asyncio.gather for parallel layers)
  |     |
  |     ├── PydanticAI Agent (OpenAI)   ─── streams tokens back via SSE
  |     ├── PydanticAI Agent (Anthropic) ─── streams tokens back via SSE
  |     ├── Optional LLM Judge (scores output, retries if below threshold)
  |     └── Collector Agent (synthesizes direct inputs into final report)
  |
  ├── SQLite (default) or PostgreSQL (Docker Compose)
  |     ├── Users, Sandboxes, Runs, Node I/O
  |     └── Alembic migrations
  |
  └── pydantic-settings loads .env automatically
```

The frontend Vite dev server proxies all API calls (`/runs`, `/health`, `/graph`, `/providers`, etc.) to the backend at `localhost:8000`. In production (Docker), the backend serves the compiled frontend from `frontend/dist` as static files.

---

## Tech stack

### Backend

| Component       | Technology                                                |
| --------------- | --------------------------------------------------------- |
| Framework       | FastAPI (async Python)                                    |
| Agent execution | PydanticAI (`pydantic-ai-slim[openai,anthropic]`)         |
| Data validation | Pydantic v2 + SQLModel                                    |
| Database        | PostgreSQL 16 (Docker) or SQLite (local fallback)         |
| Migrations      | Alembic                                                   |
| Auth            | JWT via python-jose (disabled by default for development) |
| Streaming       | Server-Sent Events (SSE)                                  |
| Python version  | 3.10+ required, 3.12 in Docker                            |

### Frontend

| Component          | Technology                  |
| ------------------ | --------------------------- |
| Framework          | React 18 + TypeScript       |
| Canvas             | ReactFlow / XY Flow v12     |
| State management   | Zustand                     |
| Styling            | Tailwind CSS                |
| Build tool         | Vite                        |
| Markdown rendering | react-markdown + remark-gfm |

---

## Prerequisites

- **Docker Desktop** (recommended path; handles Python, Node, and Postgres for you)
- OR: **Python 3.10+** and **Node.js 18+** installed locally
- At least one LLM API key: **OpenAI** (`OPENAI_API_KEY`) or **Anthropic** (`ANTHROPIC_API_KEY`)

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/cursor-hackathon-SuburbanFlow.git
cd cursor-hackathon-SuburbanFlow
```

### 2. Create the environment file

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in at least one API key:

```dotenv
# At least one of these is required for agents to work:
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Leave these as-is unless you want different default models:
DEFAULT_ANTHROPIC_MODEL=claude-sonnet-4-20250514
DEFAULT_OPENAI_MODEL=gpt-4o-mini

# Keep auth disabled for local development:
AUTH_DISABLED=1
```

---

## Environment variables

| Variable                  | Required         | Default                      | Description                                                                      |
| ------------------------- | ---------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`          | At least one key | (none)                       | OpenAI API key for ChatGPT agents                                                |
| `ANTHROPIC_API_KEY`       | At least one key | (none)                       | Anthropic API key for Claude agents                                              |
| `DEFAULT_OPENAI_MODEL`    | No               | `gpt-4o-mini`                | Fallback model when a node does not specify one                                  |
| `DEFAULT_ANTHROPIC_MODEL` | No               | `claude-sonnet-4-20250514`   | Fallback model for Anthropic nodes                                               |
| `AUTH_DISABLED`           | No               | `0`                          | Set to `1` to bypass JWT auth (auto-creates a dev user)                          |
| `JWT_SECRET`              | No               | (internal default)           | Secret for signing JWT tokens; change in production                              |
| `DATABASE_URL`            | No               | `sqlite:///./agentcanvas.db` | Database connection string; Docker Compose sets this to PostgreSQL automatically |

---

## Running with Docker (recommended)

This is the simplest path. Docker Compose starts PostgreSQL, builds the frontend, installs Python dependencies, runs Alembic migrations, and launches the API.

```bash
# Make sure .env exists and has your API key(s)
docker compose up --build
```

Once you see `Uvicorn running on http://0.0.0.0:8000`, open:

| URL                            | What                              |
| ------------------------------ | --------------------------------- |
| `http://localhost:8000`        | Full application (frontend + API) |
| `http://localhost:8000/docs`   | Interactive Swagger API docs      |
| `http://localhost:8000/health` | Health check                      |

To stop:

```bash
docker compose down
```

To wipe the database and start fresh:

```bash
docker compose down -v
docker compose up --build
```

---

## Running without Docker

Use two terminals. This mode uses SQLite (no Postgres needed) and the Vite dev server for hot-reload on the frontend.

### Terminal 1: backend

```bash
# Create and activate a virtual environment (Python 3.10+)
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r backend_or_api/requirements.txt

# Start the API (auto-creates SQLite DB and runs migrations)
uvicorn backend_or_api.app.main:app --reload
```

The API is now at `http://localhost:8000`.

### Terminal 2: frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend is now at `http://localhost:5173`. It proxies API calls to `localhost:8000` automatically via the Vite config.

### Troubleshooting: Vite EPERM error on Windows

If you see `EPERM: operation not permitted, rmdir ... .vite/deps`, this is a Windows/OneDrive file-lock issue. Fix:

```powershell
taskkill /IM node.exe /F
Remove-Item -Recurse -Force "frontend/node_modules/.vite" -ErrorAction SilentlyContinue
npm --prefix frontend run dev -- --force
```

The Vite config already moves the cache to `%LOCALAPPDATA%/AgentCanvas/vite-cache` to reduce this.

---

## API reference

All endpoints are documented interactively at `http://localhost:8000/docs` (Swagger UI).

### Core endpoints

| Method | Path                    | Description                                                          |
| ------ | ----------------------- | -------------------------------------------------------------------- |
| `POST` | `/runs`                 | Start a pipeline run. Body: `RunRequest` JSON. Returns `{ run_id }`. |
| `GET`  | `/runs/{run_id}`        | Get run snapshot (status, outputs, errors, collector output).        |
| `GET`  | `/runs/{run_id}/events` | SSE stream of real-time execution events.                            |
| `POST` | `/runs/{run_id}/resume` | Resume a failed run from where it stopped.                           |
| `POST` | `/graph/validate`       | Validate a pipeline graph (cycle detection, structure).              |
| `GET`  | `/health`               | Health check.                                                        |
| `GET`  | `/providers`            | Which LLM providers have keys configured (booleans only).            |
| `GET`  | `/models/defaults`      | Default model IDs for each provider.                                 |

### Auth endpoints (when `AUTH_DISABLED=0`)

| Method | Path             | Description                |
| ------ | ---------------- | -------------------------- |
| `POST` | `/auth/register` | Create a new user account. |
| `POST` | `/auth/login`    | Get a JWT access token.    |
| `GET`  | `/auth/me`       | Get current user info.     |

### Sandbox endpoints

| Method   | Path              | Description                          |
| -------- | ----------------- | ------------------------------------ |
| `GET`    | `/sandboxes`      | List sandboxes for the current user. |
| `POST`   | `/sandboxes`      | Create a new sandbox.                |
| `GET`    | `/sandboxes/{id}` | Get sandbox details.                 |
| `PUT`    | `/sandboxes/{id}` | Update sandbox (name, canvas state). |
| `DELETE` | `/sandboxes/{id}` | Delete sandbox and all runs.         |

---

## SSE event protocol

When connected to `GET /runs/{run_id}/events`, the server pushes these event types:

| Event type      | Fields                          | Description                                     |
| --------------- | ------------------------------- | ----------------------------------------------- |
| `node_start`    | `node_id`                       | Agent started executing                         |
| `node_input`    | `node_id`, `input`              | Full assembled prompt sent to the LLM           |
| `token_chunk`   | `node_id`, `chunk`              | Streamed text fragment from the LLM             |
| `node_complete` | `node_id`, `output`             | Agent finished; validated output attached       |
| `judge_verdict` | `node_id`, `attempt`, `verdict` | LLM judge scored the output                     |
| `node_error`    | `node_id`, `error`              | Agent or judge failed                           |
| `run_complete`  | `collector_output`              | Pipeline finished; collector synthesis attached |
| `stream_end`    | (none)                          | SSE stream is closing                           |

Late-connecting clients replay all events from the start of the run (event log with replay pattern).

---

## Project structure

```
cursor-hackathon-SuburbanFlow/
  backend_or_api/
    app/
      main.py                  FastAPI app entry, router mounts, SPA serving
      config.py                pydantic-settings (loads .env)
      database.py              SQLModel engine, Alembic migration runner
      db_models.py             SQLModel ORM tables (User, Sandbox, Run, etc.)
      state.py                 In-memory SSE event log + tick queues
      deps.py                  FastAPI dependency injection (auth, DB session)
      models/
        graph.py               Pydantic: AgentNode, Edge, CollectorNode, PipelineGraph
        judge.py               Pydantic: JudgeConfig, JudgeVerdict
        run.py                 Pydantic: RunRequest, RunSnapshot
        auth.py                Pydantic: auth request/response models
        sandbox.py             Pydantic: sandbox request/response models
      agents/
        base.py                BaseSandboxAgent (PydanticAI streaming execution)
        factory.py             create_sandbox_agent() factory
        pydantic_sandbox_agent.py  Concrete agent using PydanticAI
        resolution.py          Resolve model name from node config + defaults
        protocols.py           LLMClient protocol (abstraction)
        clients/               Raw SDK wrappers (OpenAI, Anthropic)
      pai/
        builders.py            build_canvas_agent(), build_judge_agent()
      judges/
        llm_judge.py           LLMJudgeService (PydanticAI agent with JudgeVerdict output)
        verdict_parser.py      Parse judge JSON (handles markdown fences)
      services/
        dag.py                 topological_layers(), upstream_outputs()
        executor.py            run_dag_pipeline() — full DAG orchestration
      routers/
        runs.py                POST /runs, GET /runs/{id}, SSE events, resume
        graph.py               POST /graph/validate
        health.py              GET /health
        meta.py                GET /providers, GET /models/defaults
        auth.py                POST /auth/register, /auth/login, /auth/me
        sandboxes.py           CRUD for sandboxes
    alembic/                   Database migration scripts
    requirements.txt           Python dependencies
    requirements-dev.txt       Test dependencies (pytest, httpx, etc.)
  frontend/
    src/
      main.tsx                 React entry point
      App.tsx                  Router + layout
      lib/
        graph.ts               Graph types, validation, payload builder
        api.ts                 authFetch() + SSE URL helpers
      stores/
        canvasStore.ts         Zustand: nodes, edges, selection, editing
        runStore.ts            Zustand: run state, SSE event dispatcher
        authStore.ts           Zustand: JWT token, login/logout
      components/
        FlowCanvas.tsx         ReactFlow canvas with drag-and-drop
        Toolbar.tsx             Run button, sandbox name, global prompt
        Inspector.tsx          Node config panel (provider, model, temp, output)
        Palette.tsx            Draggable agent templates sidebar
        CollectorOutputView.tsx Final output renderer
        EventsLog.tsx          Raw SSE event log viewer
      nodes/
        AgentNode.tsx          Custom ReactFlow node (compact, status badge)
        CollectorNode.tsx      Custom ReactFlow collector node
      pages/
        WorkspacePage.tsx      Main canvas workspace
        DashboardPage.tsx      Sandbox list / management
        LoginPage.tsx          Auth login page
        SignupPage.tsx         Auth signup page
    vite.config.ts             Vite config with API proxy
    tailwind.config.js         Tailwind theme (dark mode, canvas colors)
    package.json               Frontend dependencies
  tests/
    conftest.py                Loads .env for test session
    test_api.py                Health, providers, graph validation endpoints
    test_dag.py                Topological sort, cycle detection
    test_executor_mocked.py    DAG execution with fake agents (no LLM calls)
    test_judge_parser.py       Judge verdict JSON parsing
    test_openai_integration.py Live PydanticAI + OpenAI smoke test
    test_runs_integration.py   Live POST /runs + SSE end-to-end
    test_judge_integration.py  Live judge gate with retries
  .env.example                 Template environment file
  docker-compose.yml           Docker Compose (Postgres + API)
  Dockerfile                   Multi-stage build (Node frontend + Python backend)
  pyproject.toml               Project metadata
  alembic.ini                  Alembic configuration
```

---

## Testing

### Unit tests (no API keys needed)

```bash
pip install -r backend_or_api/requirements-dev.txt
pytest tests -v -m "not integration"
```

Tests DAG logic, graph validation, judge JSON parsing, mocked pipeline execution, and HTTP endpoint wiring.

### Integration tests (requires API keys)

These make real LLM calls. Ensure `.env` has a valid `OPENAI_API_KEY`.

```bash
pytest tests -v -m integration
```

Tests: live PydanticAI agent call, full `POST /runs` end-to-end with SSE, judge retry loop.

### All tests

```bash
pytest tests -v
```

### Running tests in Docker (Python 3.12)

```bash
docker run --rm -v "${PWD}:/app" -w /app python:3.12-slim bash -c \
  "pip install -q -r backend_or_api/requirements.txt -r backend_or_api/requirements-dev.txt && pytest tests -v"
```

---

## How the DAG executor works

The executor in `services/executor.py` orchestrates the full pipeline:

1. **Topological sort** (`services/dag.py`): Kahn's algorithm groups nodes into layers. Nodes in the same layer have no dependencies on each other.

2. **Parallel execution**: Each layer runs via `asyncio.gather()`. If layer 2 has agents B and C (both depending only on A from layer 1), B and C execute their LLM calls concurrently.

3. **Agent construction**: For each node, `create_sandbox_agent()` calls `build_canvas_agent()` which creates a PydanticAI `Agent` with the node's provider, model, system prompt, temperature, and output type.

4. **Streaming**: `BaseSandboxAgent.run()` opens a PydanticAI `run_stream()` session. Token fragments are forwarded through the `on_event` callback chain to the SSE endpoint in real time.

5. **Data passing**: When an agent completes, its validated output is stored in the `outputs` dict. Downstream agents receive their upstream outputs as serialized JSON in their user prompt, along with the global context and user instruction.

6. **Collector**: After all agent layers complete, the collector runs as a dedicated agent. It receives only the outputs from agents directly connected to it (not all agents), synthesizes them, and produces the final report.

---

## LLM judge nodes

Any agent node can optionally have a `judge` configuration. When enabled:

1. After the agent produces output, a separate PydanticAI `Agent` with `output_type=JudgeVerdict` evaluates the output against the specified criteria.
2. The verdict includes `passed` (bool), `score` (0.0-1.0), and `feedback` (string).
3. If the score is below `min_score`, the original agent re-runs with the judge's feedback appended to the prompt.
4. This retry loop continues up to `max_retries` times.
5. If all attempts fail the judge gate, the node errors and the pipeline stops.

Judge configuration is set per-node in the run payload:

```json
{
  "judge": {
    "enabled": true,
    "criteria": "Output must contain at least 3 cited sources.",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "min_score": 0.7,
    "max_retries": 2
  }
}
```

---

## License

Built during the Cursor Hackathon at IE University, March 2026.
