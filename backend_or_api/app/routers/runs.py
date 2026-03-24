from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse

from ..config import Settings, get_settings
from ..models import RunRequest, RunSnapshot
from ..services.executor import run_dag_pipeline
from ..state import RUN_EVENT_LOG, RUN_EVENT_TICK_QUEUES, RUNS

router = APIRouter(tags=["runs"])


async def _broadcast_event(run_id: str, event: dict[str, Any]) -> None:
    RUN_EVENT_LOG[run_id].append(event)
    for tick_q in list(RUN_EVENT_TICK_QUEUES[run_id]):
        await tick_q.put(None)


async def _run_pipeline_job(run_id: str, payload: RunRequest, settings: Settings) -> None:
    RUNS[run_id].status = "running"

    async def on_event(event: dict[str, Any]) -> None:
        if event.get("type") == "node_complete":
            node_id = event["node_id"]
            RUNS[run_id].outputs[node_id] = event["output"]
        await _broadcast_event(run_id, event)

    try:
        _, judge_history = await run_dag_pipeline(
            payload.graph,
            payload.prompt,
            on_event,
            settings,
        )
        RUNS[run_id].judge_summaries = judge_history
        RUNS[run_id].status = "done"
    except Exception as exc:  # pragma: no cover - defensive path
        RUNS[run_id].status = "failed"
        RUNS[run_id].error = str(exc)
        await _broadcast_event(run_id, {"type": "node_error", "error": str(exc)})
    finally:
        await _broadcast_event(run_id, {"type": "stream_end"})


@router.post("/runs")
async def start_run(
    payload: RunRequest,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    run_id = str(uuid.uuid4())
    RUNS[run_id] = RunSnapshot(run_id=run_id, status="pending")
    background_tasks.add_task(_run_pipeline_job, run_id, payload, settings)
    return {"run_id": run_id}


@router.get("/runs/{run_id}", response_model=RunSnapshot)
async def get_run(run_id: str) -> RunSnapshot:
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Run not found")
    return RUNS[run_id]


@router.get("/runs/{run_id}/events")
async def stream_run_events(run_id: str) -> StreamingResponse:
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Run not found")

    tick_queue: asyncio.Queue[None] = asyncio.Queue()
    RUN_EVENT_TICK_QUEUES[run_id].append(tick_queue)

    log = RUN_EVENT_LOG[run_id]

    async def event_generator():
        seen = 0
        try:
            while True:
                while seen < len(log):
                    event = log[seen]
                    seen += 1
                    if event.get("type") == "stream_end":
                        yield "event: end\ndata: {}\n\n"
                        return
                    yield f"data: {json.dumps(event)}\n\n"
                await tick_queue.get()
        finally:
            if tick_queue in RUN_EVENT_TICK_QUEUES[run_id]:
                RUN_EVENT_TICK_QUEUES[run_id].remove(tick_queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
