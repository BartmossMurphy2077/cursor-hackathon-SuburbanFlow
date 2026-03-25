<p align="center">
  <img src="frontend/public/favicon.svg" width="48" height="48" alt="AgentCanvas logo" />
</p>

<h1 align="center">AgentCanvas</h1>

<p align="center">
  <strong>Visual multi-agent orchestration on an infinite canvas.</strong><br />
  Drag AI agents, wire data flows, and watch multi-model teams execute in real-time.
</p>

<p align="center">
  <a href="https://agentcanvas-pi.vercel.app">Live Demo</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#getting-started">Getting Started</a>
</p>

---

## The Problem

Modern AI workflows often involve multiple specialized models working together: one agent researches, another writes, a third validates. But orchestrating this is painful. You either chain prompts in a script, wrestle with complex frameworks, or lose visibility into what each agent is doing.

**AgentCanvas makes one person's hard day easier**: the developer, researcher, or content creator who needs to coordinate multiple AI agents but wants to *see* the pipeline, *configure* each node visually, and *watch* results stream in live rather than staring at terminal logs.

## Features

### Visual DAG Builder
Drag agent nodes onto an infinite canvas powered by React Flow. Connect them with edges to define data flow. The graph is validated as a Directed Acyclic Graph before execution.

### Multi-Model Agents
Each node picks its own LLM provider and model. Mix Claude (Anthropic) and GPT-4o (OpenAI) on the same canvas. Configure temperature, output format, and system prompts per node.

### Live Token Streaming
Watch agents think in real-time. Token-by-token output streams into each node via Server-Sent Events. Status indicators (idle / running / done / error) update live on the canvas.

### Smart Collector
A special synthesis node at the end of the pipeline. The Collector receives outputs from all directly connected upstream agents and produces a final merged result using its own LLM call.

### Typed Pipelines
Every node's input and output passes through Pydantic validation. Structured data flows between agents — no string parsing, no prompt hacking.

### Parallel Execution
Independent branches of the DAG execute concurrently via Python's `asyncio.gather()`. Your pipeline is only as slow as its longest critical path.

### Sandbox Workspaces
Each project lives in its own sandbox with persistent graph state, run history, and autosave. Create, open, and manage multiple sandboxes from the dashboard.

### Dark & Light Mode
Full theme support with a toggle in the UI. The entire interface — canvas, nodes, panels, landing page — adapts seamlessly.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React SPA                         │
│  React 18 · React Flow (XY Flow) · Zustand · Vite  │
│  Tailwind CSS · TypeScript                          │
└──────────────────┬──────────────────────────────────┘
                   │  POST /runs
                   │  GET /runs/{id}/events (SSE)
                   │  CRUD /sandboxes
┌──────────────────▼──────────────────────────────────┐
│                 FastAPI Backend                       │
│  Python 3.12 · PydanticAI · SQLModel · Alembic      │
│  JWT Auth · Async DAG Executor                       │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   PostgreSQL   Anthropic   OpenAI
                  API        API
```

### Execution Flow

1. The frontend serializes the canvas graph into a `PipelineGraph` payload and sends `POST /runs`.
2. The backend validates the graph, resolves topological order, and identifies independent branches.
3. Agents execute in dependency order. Independent branches run in parallel via `asyncio.gather()`.
4. Each agent streams token chunks back to the frontend via SSE events.
5. The Collector node runs last, merging upstream outputs into a final synthesized result.
6. All outputs are persisted per-run for history and inspection.

### SSE Event Protocol

```json
{ "type": "node_start",    "node_id": "researcher" }
{ "type": "token_chunk",   "node_id": "researcher", "chunk": "Atomic structures..." }
{ "type": "node_complete", "node_id": "researcher", "output": { ... } }
{ "type": "node_error",    "node_id": "researcher", "error": "Rate limit" }
{ "type": "run_complete",  "collector_output": { ... } }
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS 3, React Flow (XY Flow) 12, Zustand 5, React Router 7 |
| **Backend** | Python 3.12, FastAPI, PydanticAI, Pydantic, SQLModel |
| **Database** | PostgreSQL 16 (via psycopg), Alembic migrations |
| **Auth** | JWT (python-jose), passlib |
| **LLM Providers** | Anthropic (Claude), OpenAI (GPT-4o) via PydanticAI |
| **Deployment** | Vercel (frontend + serverless API), Docker Compose (local) |

---

## Getting Started

### Prerequisites

- **Python 3.10+** and **Node.js 18+** (or Docker)
- At least one LLM API key: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- PostgreSQL (provided via Docker Compose, or bring your own)

### 1. Clone the Repository

```bash
git clone https://github.com/BartmossMurphy2077/cursor-hackathon-SuburbanFlow.git
cd cursor-hackathon-SuburbanFlow
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Set AUTH_DISABLED=1 for local development without login
AUTH_DISABLED=1
```

### 3a. Run with Docker (Recommended)

If you see `EPERM: operation not permitted, rmdir ... .vite/deps`, this is a Windows/OneDrive file-lock issue. Fix:

```powershell
taskkill /IM node.exe /F
Remove-Item -Recurse -Force "frontend/node_modules/.vite" -ErrorAction SilentlyContinue
npm --prefix frontend run dev -- --force
```

Open [http://localhost:8000](http://localhost:8000). The frontend and API are both served from port 8000.

### 3b. Run without Docker

**Backend:**

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r backend_or_api/requirements.txt
uvicorn backend_or_api.app.main:app --reload --port 8000
```

**Frontend (separate terminal):**

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on [http://localhost:5173](http://localhost:5173) and proxies API requests to port 8000.

---

## Project Structure

```
├── api/
│   └── index.py                  # Vercel serverless entrypoint
├── backend_or_api/
│   ├── app/
│   │   ├── main.py               # FastAPI app, static file serving, SPA catch-all
│   │   ├── agents/               # PydanticAI agent wrappers (base, factory, clients)
│   │   ├── services/
│   │   │   ├── executor.py       # Async DAG executor with parallel branch support
│   │   │   └── dag.py            # Topological sort and dependency resolution
│   │   ├── routers/              # FastAPI route handlers (runs, sandboxes, auth, etc.)
│   │   ├── models/               # Pydantic request/response models
│   │   ├── db_models.py          # SQLModel database tables
│   │   └── judges/               # LLM-as-judge evaluation (optional)
│   ├── alembic/                  # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Route definitions
│   │   ├── pages/                # LandingPage, LoginPage, DashboardPage, WorkspacePage
│   │   ├── nodes/                # AgentNode, CollectorNode (React Flow custom nodes)
│   │   ├── components/           # Toolbar, Inspector, Palette, EventsLog, etc.
│   │   ├── stores/               # Zustand stores (auth, canvas, run, theme)
│   │   └── lib/                  # API helpers, graph validation
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   ├── IDEA.md                   # Full product concept and architecture proposals
│   ├── ARCHITECTURE.md           # System architecture diagrams and decisions
│   └── CHALLENGE.md              # Hackathon challenge brief
├── docker-compose.yml
├── Dockerfile                    # Multi-stage: Node build + Python runtime
├── vercel.json                   # Vercel deployment config with API rewrites
└── .env.example
```

---

## API Reference

### Runs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/runs` | Start a pipeline run. Body: `{ sandbox_id, prompt, graph }`. Returns `{ run_id }`. |
| `GET` | `/runs/{run_id}/events` | SSE stream of execution events (token chunks, status updates). |
| `GET` | `/runs/{run_id}` | Get run snapshot with status and outputs. |

### Sandboxes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/sandboxes` | Create a new sandbox. |
| `GET` | `/sandboxes` | List all sandboxes for the authenticated user. |
| `GET` | `/sandboxes/{id}` | Get sandbox details. |
| `PATCH` | `/sandboxes/{id}` | Update sandbox name/description. |
| `DELETE` | `/sandboxes/{id}` | Delete sandbox and all associated runs. |
| `GET` | `/sandboxes/{id}/graph` | Get the saved pipeline graph. |
| `PATCH` | `/sandboxes/{id}/graph` | Update (autosave) the pipeline graph. |
| `GET` | `/sandboxes/{id}/runs` | List runs for a sandbox. |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create a new account. Returns JWT. |
| `POST` | `/auth/login` | Sign in. Returns JWT. |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check. Returns `{ "status": "ok" }`. |

---

## Deployment

### Vercel

The project is configured for Vercel deployment:

```bash
vercel --prod
```

`vercel.json` handles:
- Frontend build: `cd frontend && npm ci && npm run build`
- Static file serving from `frontend/dist`
- API route rewrites to `/api/index.py` (Python serverless function)
- SPA catch-all for client-side routing
- Cache headers to prevent stale asset issues

Required Vercel environment variables:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET`

### Docker

```bash
docker compose up --build
```

The `Dockerfile` is a multi-stage build:
1. **Stage 1** (Node): Builds the React frontend
2. **Stage 2** (Python): Installs backend dependencies, copies the built frontend, runs uvicorn

---

## Example Pipeline

```
┌──────────────┐     ┌──────────────┐
│  Researcher  │────▶│    Writer    │
│  (GPT-4o)    │     │  (Claude)    │
└──────┬───────┘     └──────┬───────┘
       │                    │
       │    ┌───────────────┘
       │    │
       ▼    ▼
  ┌────────────┐
  │  Collector  │
  │  (Claude)   │
  └────────────┘
```

1. **Researcher** uses GPT-4o to produce a structured research summary.
2. **Writer** takes the research output and drafts a report using Claude.
3. **Collector** merges everything into a final polished document.

Each agent streams its output live to the canvas. The entire pipeline runs in seconds.

---

## Contributing

This project was built for the **Cursor Hackathon at IE University (March 2026)**.

To contribute:
1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes
4. Push to the branch and open a Pull Request

---

## License

This project is provided as-is for the hackathon. See the repository for licensing details.

---

<p align="center">
  <sub>Built with Cursor, PydanticAI, and FastAPI</sub>
</p>
