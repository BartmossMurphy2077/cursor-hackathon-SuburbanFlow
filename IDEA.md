# AgentCanvas — Idea Document

> A visual, sandbox-based multi-agent orchestration platform for the web.

---

## 1. Core Concept

AgentCanvas is a browser-based platform that reimagines the AI chat interface. Instead of linear conversations, users work inside **Sandboxes** — infinite canvas environments where AI agents can be dragged, dropped, configured, wired together, and executed as a composable pipeline.

Each sandbox is a self-contained project. Within it, users place **Agent Nodes** that each carry a specific role, a model configuration, an input/output schema, and contextual instructions. Agents are connected via directed edges (arrows) that represent the flow of data. When the pipeline is run, each agent executes in topological order — outputs from upstream agents become inputs to downstream ones — until a final **Collector Node** assembles the complete result.

This is not a workflow automation tool (à la n8n or Zapier). The agents here are _intelligent_ — they reason, synthesize, produce structured content, write code, and reflect on prior outputs. The canvas is the interface to that intelligence.

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

### Architecture C — FastAPI + PydanticAI + WebSockets ✅ CHOSEN

**Overview:**
A decoupled architecture built around **PydanticAI** as the agent execution framework. A React SPA frontend communicates with a FastAPI backend over WebSockets for real-time streaming. PydanticAI handles structured agent definitions, typed inter-agent data passing, MCP tool integration, and LLM-as-judge validation. A lightweight homegrown DAG executor (≈150 lines) orchestrates the graph — resolving topological order, running independent branches concurrently via `asyncio.gather()`, and streaming execution events back to the canvas in real time.

**Stack:**

- Frontend: React + Vite + ReactFlow (XY Flow) + Zustand + Tailwind
- Backend: FastAPI (Python, async)
- Agent Framework: PydanticAI
- LLM: Anthropic API via PydanticAI's Anthropic provider (per-agent model config)
- Storage: PostgreSQL via SQLModel (sandbox/agent/edge metadata + run history)
- Run State: In-memory async state during execution; persisted to Postgres on completion
- Auth: JWT (FastAPI-Users)
- MCP: PydanticAI MCP client — agents can be assigned MCP servers (brave-search, filesystem, code-execution, etc.) from the canvas UI
- Deployment: Docker Compose (dev) → Railway / Render / fly.io (prod)

**Execution Model:**

```
Canvas UI
  │  (WebSocket: /ws/run/{sandbox_id})
  ▼
FastAPI WebSocket Handler
  │
  ▼
DAG Executor (homegrown, ~150 lines)
  ├── 1. Topological sort of the agent graph
  ├── 2. Identify independent branches → asyncio.gather() for parallel runs
  ├── 3. For each agent node in order:
  │     ├── Inject upstream outputs + global context via RunContext[Deps]
  │     ├── Call pydantic_agent.run_stream(prompt, deps=ctx)
  │     ├── Forward token chunks → WebSocket → canvas node (live streaming)
  │     └── Validate output against agent's Pydantic output model
  └── 4. Collector Node: merge all outputs → final PydanticAI synthesis pass
```

**PydanticAI Agent Definition (per node):**

```python
from pydantic import BaseModel
from pydantic_ai import Agent

class ResearchSummary(BaseModel):
    overview: str
    key_concepts: list[str]
    sim_params: dict
    confidence: float  # used by LLM judge

researcher = Agent(
    model="claude-sonnet-4-5",
    output_type=ResearchSummary,
    system_prompt="You are a deep research agent specialising in atomic structures...",
    mcp_servers=[brave_search_mcp, arxiv_mcp],  # configured per node in UI
)
```

**Structured Inter-Agent Data Flow:**
Each agent's `output_type` is a Pydantic model. When an agent completes, its validated output object is stored in the run context and injected directly into downstream agents — no string parsing, no prompt hacking. The canvas UI reads the output schema to render a typed preview panel per node.

**LLM Judge Nodes:**
A special `ValidatorNode` type wraps any agent output with a judge agent that scores it against defined criteria before allowing data to flow downstream. If the score falls below a threshold, the node can re-run the upstream agent with augmented instructions (retry loop with max attempts).

```python
judge = Agent(
    model="claude-opus-4-5",
    output_type=JudgeVerdict,  # { passed: bool, score: float, feedback: str }
    system_prompt="Evaluate the research summary for completeness and accuracy...",
)
```

**MCP Tool Assignment:**
From the canvas UI, each agent node has an "Add Tools" panel where users can attach MCP servers. The backend maps these to PydanticAI `MCPServerStdio` or `MCPServerHTTP` instances and injects them into the agent at run time. Example assignments:

- Agent 1 (Researcher) → `brave-search` MCP + `arxiv` MCP
- Agent 3 (C++ Engineer) → `filesystem` MCP + `code-execution` MCP
- Collector → `filesystem` MCP (to write final output files)

**WebSocket Event Protocol:**
The backend streams typed JSON events over the WebSocket connection:

```json
{ "type": "node_start",    "node_id": "agent_1" }
{ "type": "token_chunk",   "node_id": "agent_1", "chunk": "Atomic structures are..." }
{ "type": "node_complete", "node_id": "agent_1", "output": { "overview": "...", ... } }
{ "type": "node_error",    "node_id": "agent_1", "error": "Rate limit exceeded" }
{ "type": "run_complete",  "collector_output": { ... } }
```

The canvas frontend maps these events to node status indicators, streaming text panels, and edge animations.

**Pros:**

- Structured, typed outputs make inter-agent data passing robust and inspectable
- True async parallel execution of independent graph branches
- MCP tool support is first-class and user-configurable per node
- LLM judge nodes are native to the framework
- Multi-model per node (mix Claude, GPT-4o, Gemini on the same canvas)
- No vendor lock-in beyond Anthropic API; deploy anywhere Docker runs
- FastAPI + SQLModel is a clean, well-documented Python stack

**Cons:**

- PydanticAI is relatively new (less community resources than LangChain)
- The DAG executor needs to be built and maintained (not a framework feature)
- No built-in checkpointing/resumability — a failed mid-pipeline run must restart (mitigable by persisting per-node outputs to Postgres as they complete)
- Requires Python backend knowledge; not a pure JS stack

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

## 6. Chosen Architecture

**Long-term target:** Architecture C (FastAPI + PydanticAI + WebSockets).  
**Hackathon MVP variant:** Vercel-first API + SSE + Pydantic contracts.

The team still prefers the Architecture C model for long-term growth, but the MVP implementation is adapted to the hackathon requirement of a live Vercel deployment:

- FastAPI-compatible backend logic with Pydantic models is kept in a Python service layer
- Vercel entrypoint serves the API surface for MVP deployment
- Live updates use SSE event streaming instead of WebSockets for simpler, lower-risk implementation
- DAG execution remains async and supports parallel execution of independent node layers

This keeps the product aligned with Architecture C semantics while reducing delivery risk and infra complexity for demo day.

### 6.1 MVP Runtime Contract

MVP run events (transport-agnostic, used by frontend regardless of backend host/runtime):

- `node_start`
- `token_chunk`
- `node_complete`
- `node_error`
- `run_complete`

This contract allows migration to full WebSocket transport later without rewriting core UI state logic.

### 6.2 Migration Path to Full Architecture C

1. Keep Pydantic node input/output models as the source of truth.
2. Keep DAG executor semantics unchanged (topology + parallel branch execution).
3. Swap SSE transport to WebSockets only when bidirectional live control is needed.
4. Move deployment from Vercel runtime to Dockerized FastAPI service once longer runs or richer orchestration are required.
5. Add persistent run checkpointing when resumability becomes a product requirement.

The other architectures remain documented for reference. Architecture B (Celery) becomes relevant if run volumes grow large enough to need horizontally scaled workers. Architecture D (LangGraph) becomes relevant if conditional branching and cycle support become critical product features.

---

## 7. Canvas Technology Options

Regardless of backend choice, the canvas layer needs a solid node-graph library:

| Library                      | Pros                                          | Cons                                         |
| ---------------------------- | --------------------------------------------- | -------------------------------------------- |
| **React Flow**               | Most popular, great DX, built-in edge routing | React-only, some performance limits at scale |
| **Rete.js**                  | Framework-agnostic, plugin system             | Smaller community, steeper learning curve    |
| **Litegraph.js**             | Used in ComfyUI, very performant              | Low-level, requires more custom UI work      |
| **XY Flow (React Flow v12)** | Latest evolution of React Flow, improved perf | Still React-only                             |

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

_End of IDEA.md_
