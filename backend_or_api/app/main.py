from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .routers import auth, graph, health, meta, runs, sandboxes

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="AgentCanvas API",
    version="0.3.0",
    description=(
        "Sandbox multi-agent orchestration backend with Pydantic models, "
        "PydanticAI agents/judges, DAG execution, and SSE streaming."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(meta.router)
app.include_router(auth.router)
app.include_router(sandboxes.router)
app.include_router(runs.router)
app.include_router(graph.router)

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_FRONTEND_DIST = _REPO_ROOT / "frontend" / "dist"

if (_FRONTEND_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=str(_FRONTEND_DIST / "assets")), name="assets")


@app.get("/")
async def root():
    index = _FRONTEND_DIST / "index.html"
    if index.is_file():
        return FileResponse(index)
    return JSONResponse(
        status_code=200,
        content={
            "service": "AgentCanvas API",
            "docs": "/docs",
            "health": "/health",
            "note": "Frontend dist not found. Run frontend separately with Vite or build frontend/dist.",
        },
    )


@app.get("/favicon.svg", include_in_schema=False)
async def favicon() -> FileResponse:
    icon = _FRONTEND_DIST / "favicon.svg"
    if not icon.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(icon)
