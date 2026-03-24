from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .routers import graph, health, meta, runs

app = FastAPI(
    title="AgentCanvas API",
    version="0.2.0",
    description=(
        "Sandbox multi-agent orchestration: Pydantic-typed agents, DAG execution, "
        "optional LLM judges, SSE run events. Deployable on Vercel (Python entry) or Docker."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(meta.router)
app.include_router(runs.router)
app.include_router(graph.router)


@app.get("/")
async def root() -> FileResponse:
    return FileResponse("frontend/index.html")
