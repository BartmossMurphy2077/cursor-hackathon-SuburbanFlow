# AgentCanvas — Idea Document

> A visual, sandbox-based multi-agent orchestration platform for the web.

---

## 1. Core Concept

AgentCanvas is a browser-based platform that reimagines the AI chat interface. Instead of linear conversations, users work inside **Sandboxes** — infinite canvas environments where AI agents can be dragged, dropped, configured, wired together, and executed as a composable pipeline.

Each sandbox is a self-contained project. Within it, users place **Agent Nodes** that each carry a specific role, a model configuration, an input/output schema, and contextual instructions. Agents are connected via directed edges (arrows) that represent the flow of data. When the pipeline is run, each agent executes in topological order — outputs from upstream agents become inputs to downstream ones — until a final **Collector Node** assembles the complete result.

This is not a workflow automation tool (à la n8n or Zapier). The agents here are *intelligent* — they reason, synthesize, produce structured content, write code, and reflect on prior outputs. The canvas is the interface to that intelligence.

---

## 2. Key Entities

### 2.1 Sandbox
A named, persistent workspace stored per user. Think of it as a "project". It contains:
- A canvas (node graph) with agents and connections
- A global context panel (shared variables, files, references all agents can read)
- A run history log
- An output panel showing the final assembled result

### 2.2 Agent Node
The fundamental unit. Each agent has:
- **Name** — user-defined label (e.g. "Researcher", "Writer", "Simulation Engineer")
- **Role / System Prompt** — what this agent does, written by the user in natural language
- **Model** — which LLM powers this agent (e.g. Claude Sonnet, Opus, etc.)
- **Input Schema** — what structured data it expects from upstream agents
- **Output Schema** — what structured data it produces (JSON, Markdown, code block, etc.)
- **Status Indicator** — idle / running / done / error
- **Preview Panel** — shows its output once run

### 2.3 Edge (Connection)
A directed arrow between two agent nodes. Carries:
- Which output field from the source maps to which input field in the destination
- Optional transformation instructions (e.g. "summarize before passing")

### 2.4 Collector Node
A special terminal node that:
- Accepts connections from multiple agents
- Merges all upstream outputs into a single structured document
- Can optionally use an LLM pass to synthesize/integrate results
- Renders the final output as Markdown, PDF export, or downloadable archive

### 2.5 Global Context
A sidebar panel where users upload files, paste reference material, or define global variables. All agents in the sandbox can optionally read from this shared context.

---

## 3. Example Pipeline (as described)

```
[ Agent 1: Atomic Researcher ]
  Role: "Perform deep research into atomic structures. Return a structured
         summary with sections: Overview, Key Concepts, Notable Properties,
         Open Questions."
  Output: JSON { summary: string, key_concepts: string[], sim_params: object }
         |
         |───────────────────────────────────────────────────┐
         │                                                   │
         ▼                                                   ▼
[ Agent 2: Report Writer ]                    [ Agent 3: C++ Simulation Engineer ]
  Role: "Receive the research summary          Role: "Using the research summary and
         and produce a structured,                    simulation parameters, write a
         academic-style essay/report."                C++ simulation of atomic structures.
  Output: Markdown report                             Return compiling, commented code."
         │                                                   │
         └───────────────────┬───────────────────────────────┘
                             ▼
                  [ Collector Node ]
                    Assembles: Essay + Simulation Code + Research Summary
                    Final Output: Structured ZIP or Markdown document
```

---

## 4. User Experience Flow

1. **Create a Sandbox** — Name it, optionally add global context files.
2. **Drag Agents onto Canvas** — From a sidebar panel of agent templates or blank nodes.
3. **Configure Each Agent** — Click a node to open its config drawer: set the name, role, model, output format.
4. **Wire Agents Together** — Drag from an output port to an input port. Define field mappings if needed.
5. **Run the Pipeline** — Hit "Run". Agents execute in order, each streaming their output live.
6. **Review Results** — Click any node to see its output. The Collector renders the final assembled result.
7. **Iterate** — Tweak agent prompts, reconnect nodes, re-run individual agents or the whole pipeline.

---

## 5. Architectural Proposals

### Architecture A — Monolithic Next.js + Server Actions (Simple, Fast to Ship)

**Overview:**
A single Next.js 14+ application using App Router and Server Actions. The canvas is a React-based node editor (using `reactflow`). Agent execution happens in Next.js API routes that stream responses from the Anthropic API using the Vercel AI SDK.

**Stack:**
- Frontend: Next.js + React + ReactFlow (canvas) + Tailwind
- Backend: Next.js API routes / Server Actions
- LLM: Anthropic API via Vercel AI SDK (`streamText`)
- Storage: PostgreSQL (Supabase) for sandboxes, agents, edges, run history
- Auth: Clerk or NextAuth
- Deployment: Vercel

**Execution Model:**
- On "Run", the client sends the full pipeline graph to a single `/api/run` endpoint.
- The server resolves topological order, then calls agents sequentially (or in parallel where possible).
- Each agent call streams back via SSE (Server-Sent Events) to the client.
- Results accumulate in client-side state as agents complete.

**Pros:** Simple, fast to build, great DX, easy deployment.  
**Cons:** Long-running pipelines can hit serverless function timeouts. Limited horizontal scalability. Sequential execution creates bottlenecks for large graphs.

---

### Architecture B — Decoupled Frontend + FastAPI Backend + Task Queue (Scalable, Production-Ready)

**Overview:**
A React SPA frontend (Vite + ReactFlow) talking to a Python FastAPI backend. Agent execution is handed off to a Celery/Redis task queue, enabling true async, parallel, and resumable execution. Results are streamed back via WebSockets.

**Stack:**
- Frontend: React + Vite + ReactFlow + Zustand (state) + Tailwind
- Backend: FastAPI (Python)
- Task Queue: Celery + Redis
- LLM: Anthropic Python SDK (async)
- Storage: PostgreSQL + SQLAlchemy (sandboxes, agents, edges); Redis (run state/streaming buffer)
- Auth: FastAPI-Users or custom JWT
- Deployment: Docker Compose → Kubernetes or Railway/Render

**Execution Model:**
- On "Run", the API receives the graph, validates it, then enqueues tasks in topological order.
- Celery workers execute agents concurrently where the graph allows (nodes with no interdependency run in parallel).
- Each running agent streams tokens back to Redis, which the WebSocket endpoint forwards to the connected frontend client in real time.
- Run state (pending / running / done / failed per node) is stored in Redis and polled/subscribed to by the client.

**Pros:** True parallel execution, resilient (can resume failed runs), scalable workers, no timeout limits.  
**Cons:** More infrastructure to manage. More complex local dev setup. Higher initial complexity.

---

### Architecture C — Cloudflare Workers + Durable Objects (Edge-Native, Globally Distributed)

**Overview:**
The entire backend runs on Cloudflare's edge infrastructure. Each Sandbox run is a **Durable Object** — a persistent, stateful actor that orchestrates agent execution and manages WebSocket connections. Agent calls are made from Workers directly to the Anthropic API.

**Stack:**
- Frontend: React + Vite + ReactFlow, served via Cloudflare Pages
- Backend: Cloudflare Workers (API) + Durable Objects (run orchestration + WebSocket hub)
- LLM: Anthropic API (called from Workers)
- Storage: Cloudflare D1 (SQLite, for sandbox/agent metadata) + Durable Object storage (run state)
- Auth: Cloudflare Access or custom JWT validated at the Worker edge
- Deployment: Fully Cloudflare (zero ops)

**Execution Model:**
- On "Run", the client connects to a Durable Object instance for that sandbox run via WebSocket.
- The Durable Object resolves the execution graph and fans out fetch() calls to the Anthropic API for each agent, respecting dependency order.
- Token streams are forwarded from each Anthropic response back through the Durable Object to the connected client in real time.
- Run state lives in the Durable Object's storage, making it resumable across reconnects.

**Pros:** Zero cold starts, globally distributed, extremely low latency, fully serverless with no ops burden, WebSocket support is native.  
**Cons:** Durable Objects have compute and memory limits. Cloudflare ecosystem lock-in. Less mature tooling vs. Node/Python ecosystems. Debugging is harder.

---

### Architecture D — Event-Driven Microservices with LangGraph (Powerful, Enterprise-Grade)

**Overview:**
The most powerful and extensible architecture. Agent orchestration is handled by **LangGraph** (a stateful graph execution framework built on LangChain). A React frontend communicates with a thin API gateway. Each agent is a LangGraph node. The graph executes as a persistent, resumable state machine. Results stream back via SSE.

**Stack:**
- Frontend: React + Vite + ReactFlow + Tailwind
- API Gateway: FastAPI or Node.js Express
- Orchestration Engine: LangGraph (Python) running as a separate service
- LLM: Anthropic API (via LangChain's Anthropic integration)
- Storage: PostgreSQL (metadata) + LangGraph's built-in checkpointer (run state, using Redis or Postgres backend)
- Message Bus: Optional — Redis Streams or Kafka for event-driven agent triggers
- Auth: JWT / OAuth2
- Deployment: Docker Compose or Kubernetes

**Execution Model:**
- The sandbox graph is serialized and submitted to the LangGraph service as a compiled `StateGraph`.
- LangGraph manages execution order, state passing between nodes, conditional branching (if needed), and checkpointing for resumability.
- The API gateway streams LangGraph events (node start, token chunk, node end) as SSE to the frontend.
- The frontend maps these events back to nodes on the canvas, updating their status and streaming content live.

**Pros:** Most powerful execution semantics. Built-in support for cycles, conditional branching, human-in-the-loop interrupts, and streaming. Highly extensible. Resume any run from any checkpoint.  
**Cons:** Steep learning curve. Heavy dependency on the LangChain/LangGraph ecosystem. Most complex to deploy.

---

## 6. Recommended Starting Point

For a first version (MVP), **Architecture A** is the pragmatic choice — it ships fastest and covers the core use case (linear/DAG pipelines, sequential execution, streaming output). 

Once product-market fit is established and pipelines grow more complex (parallel execution, loops, large graphs, enterprise usage), migrate the execution engine to **Architecture B or D** while keeping the frontend unchanged — the canvas and API contract are backend-agnostic.

---

## 7. Canvas Technology Options

Regardless of backend choice, the canvas layer needs a solid node-graph library:

| Library | Pros | Cons |
|---|---|---|
| **React Flow** | Most popular, great DX, built-in edge routing | React-only, some performance limits at scale |
| **Rete.js** | Framework-agnostic, plugin system | Smaller community, steeper learning curve |
| **Litegraph.js** | Used in ComfyUI, very performant | Low-level, requires more custom UI work |
| **XY Flow (React Flow v12)** | Latest evolution of React Flow, improved perf | Still React-only |

**Recommendation:** React Flow (XY Flow) for MVP. Its ecosystem, documentation, and examples are unmatched for this use case.

---

## 8. Future Ideas

- **Agent Templates Library** — Pre-built agents for common tasks (researcher, coder, summarizer, critic, translator) that users can drop in and customize.
- **Human-in-the-Loop Nodes** — Pause execution at a node and ask the user to review/edit before continuing downstream.
- **Conditional Branching** — Edges with conditions (e.g. "if research confidence < 0.7, route to a deeper research agent").
- **Sub-Sandboxes** — An agent node that itself contains a nested sandbox, enabling hierarchical composition.
- **Version History** — Snapshot any sandbox run; compare outputs across versions.
- **Collaboration** — Real-time multi-user canvas editing (like Figma for agent pipelines).
- **Export / Publish** — Export a sandbox as a reusable API endpoint or share a read-only link to results.
- **Model Routing** — Automatically select the cheapest/fastest model capable of handling a given agent's task.

---

*End of IDEA.md*
