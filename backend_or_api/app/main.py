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


async def _broadcast_event(run_id: str, event: dict[str, Any]) -> None:
    for queue in list(RUN_QUEUES[run_id]):
        await queue.put(event)


_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_FRONTEND_DIST = _REPO_ROOT / "frontend" / "dist"

if (_FRONTEND_DIST / "assets").is_dir():
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


@app.post("/runs")
async def start_run(payload: RunRequest) -> dict[str, str]:
    run_id = str(uuid.uuid4())
    RUNS[run_id] = RunSnapshot(run_id=run_id, status="pending")

    async def execute() -> None:
        RUNS[run_id].status = "running"

        async def on_event(event: dict[str, Any]) -> None:
            if event.get("type") == "node_complete":
                node_id = event["node_id"]
                RUNS[run_id].outputs[node_id] = event["output"]
            await _broadcast_event(run_id, event)

        try:
            await run_dag_pipeline(payload.graph, payload.prompt, on_event)
            RUNS[run_id].status = "done"
        except Exception as exc:  # pragma: no cover - defensive path
            RUNS[run_id].status = "failed"
            RUNS[run_id].error = str(exc)
            await _broadcast_event(run_id, {"type": "node_error", "error": str(exc)})
        finally:
            await _broadcast_event(run_id, {"type": "stream_end"})

    asyncio.create_task(execute())
    return {"run_id": run_id}


@app.get("/runs/{run_id}")
async def get_run(run_id: str) -> RunSnapshot:
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Run not found")
    return RUNS[run_id]


@app.get("/runs/{run_id}/events")
async def stream_run_events(run_id: str) -> StreamingResponse:
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Run not found")

    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    RUN_QUEUES[run_id].append(queue)

    async def event_generator():
        try:
            while True:
                event = await queue.get()
                if event.get("type") == "stream_end":
                    yield "event: end\ndata: {}\n\n"
                    break
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            if queue in RUN_QUEUES[run_id]:
                RUN_QUEUES[run_id].remove(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
