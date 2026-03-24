from __future__ import annotations

import asyncio
import json
import uuid
from collections import defaultdict
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .executor import run_dag_pipeline
from .models import RunRequest, RunSnapshot

app = FastAPI(title="AgentCanvas MVP API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RUNS: dict[str, RunSnapshot] = {}
RUN_QUEUES: dict[str, list[asyncio.Queue[dict[str, Any]]]] = defaultdict(list)

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_FRONTEND_DIST = _REPO_ROOT / "frontend" / "dist"

if (_FRONTEND_DIST / "assets").is_dir():
    # Serve the Vite production assets directly from the built dist folder.
    app.mount("/assets", StaticFiles(directory=str(_FRONTEND_DIST / "assets")), name="assets")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
async def root() -> FileResponse:
    index = _FRONTEND_DIST / "index.html"
    if index.is_file():
        return FileResponse(index)
    raise HTTPException(
        status_code=503,
        detail="Frontend not built. From repo root: cd frontend && npm install && npm run build",
    )


@app.get("/favicon.svg", include_in_schema=False)
async def favicon() -> FileResponse:
    icon = _FRONTEND_DIST / "favicon.svg"
    if not icon.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(icon)