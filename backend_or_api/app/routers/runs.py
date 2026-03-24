from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from .. import database
from ..config import Settings, get_settings
from ..database import get_session
from ..db_models import RunNodeOutput, RunRecord, Sandbox
from ..deps import get_current_user_id, get_current_user_id_sse, require_sandbox_owner
from ..graph_validate import validate_pipeline_graph
from ..models import PipelineGraph, ResumeRunBody, RunRequest, RunSnapshot
from ..services.executor import run_dag_pipeline
from ..state import RUN_EVENT_LOG, RUN_EVENT_TICK_QUEUES

router = APIRouter(tags=["runs"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _broadcast_event(run_id: str, event: dict[str, Any]) -> None:
    RUN_EVENT_LOG[run_id].append(event)
    for tick_q in list(RUN_EVENT_TICK_QUEUES[run_id]):
        await tick_q.put(None)


def _upsert_node_output(run_id: str, node_id: str, output: dict[str, Any]) -> None:
    with Session(database.engine) as session:
        row = session.exec(
            select(RunNodeOutput).where(
                RunNodeOutput.run_id == run_id,
                RunNodeOutput.node_id == node_id,
            ),
        ).first()
        if row:
            row.output = output
            session.add(row)
        else:
            session.add(
                RunNodeOutput(run_id=run_id, node_id=node_id, output=output),
            )
        session.commit()


def _patch_run_record(
    run_id: str,
    *,
    status: str | None = None,
    error: str | None = None,
    collector_output: dict[str, Any] | None = None,
    set_completed: bool = False,
) -> None:
    with Session(database.engine) as session:
        record = session.get(RunRecord, run_id)
        if not record:
            return
        if status is not None:
            record.status = status
        if error is not None:
            record.error = error
        if collector_output is not None:
            record.collector_output = collector_output
        if set_completed:
            record.completed_at = _utcnow()
        session.add(record)
        session.commit()


def _build_run_snapshot(session: Session, record: RunRecord) -> RunSnapshot:
    rows = session.exec(
        select(RunNodeOutput).where(RunNodeOutput.run_id == record.run_id),
    ).all()
    outputs = {row.node_id: row.output for row in rows}
    return RunSnapshot(
        run_id=record.run_id,
        status=record.status,  # type: ignore[arg-type]
        outputs=outputs,
        error=record.error,
        collector_output=record.collector_output,
    )


def _assert_run_access(session: Session, run_id: str, user_id: str) -> RunRecord:
    record = session.get(RunRecord, run_id)
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")
    require_sandbox_owner(session, record.sandbox_id, user_id)
    return record


async def _run_pipeline_job(
    run_id: str,
    graph: PipelineGraph,
    prompt: str,
    settings: Settings,
    *,
    initial_outputs: dict[str, dict[str, Any]] | None = None,
) -> None:
    _patch_run_record(run_id, status="running")

    async def on_event(event: dict[str, Any]) -> None:
        if event.get("type") == "node_complete":
            _upsert_node_output(run_id, event["node_id"], event["output"])
        elif event.get("type") == "run_complete":
            _patch_run_record(
                run_id,
                status="done",
                collector_output=event.get("collector_output"),
                set_completed=True,
            )
        await _broadcast_event(run_id, event)

    try:
        await run_dag_pipeline(
            graph,
            prompt,
            on_event,
            settings,
            initial_outputs=initial_outputs,
        )
    except Exception as exc:  # pragma: no cover - defensive path
        _patch_run_record(
            run_id,
            status="failed",
            error=str(exc),
            set_completed=True,
        )
        await _broadcast_event(run_id, {"type": "node_error", "error": str(exc)})
    finally:
        await _broadcast_event(run_id, {"type": "stream_end"})


@router.post("/runs")
async def start_run(
    payload: RunRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    require_sandbox_owner(session, payload.sandbox_id, user_id)
    validate_pipeline_graph(payload.graph)

    run_id = str(uuid.uuid4())
    record = RunRecord(
        run_id=run_id,
        sandbox_id=payload.sandbox_id,
        status="pending",
        prompt=payload.prompt,
    )
    session.add(record)
    session.commit()

    asyncio.create_task(
        _run_pipeline_job(run_id, payload.graph.model_copy(), payload.prompt, settings),
    )
    return {"run_id": run_id}


@router.post("/runs/{run_id}/resume")
async def resume_run(
    run_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
    body: ResumeRunBody = ResumeRunBody(),
) -> dict[str, str]:
    record = _assert_run_access(session, run_id, user_id)
    if record.status != "failed":
        raise HTTPException(status_code=400, detail="Only failed runs can be resumed")

    sandbox_row = session.get(Sandbox, record.sandbox_id)
    if not sandbox_row:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    graph = PipelineGraph.model_validate(sandbox_row.canvas_state)
    validate_pipeline_graph(graph)

    prompt = body.prompt if body.prompt is not None else record.prompt

    existing_rows = session.exec(
        select(RunNodeOutput).where(RunNodeOutput.run_id == run_id),
    ).all()
    initial_outputs = {r.node_id: r.output for r in existing_rows}

    record.status = "pending"
    record.error = None
    record.completed_at = None
    record.collector_output = None
    record.prompt = prompt
    session.add(record)
    session.commit()

    asyncio.create_task(
        _run_pipeline_job(
            run_id,
            graph.model_copy(),
            prompt,
            settings,
            initial_outputs=initial_outputs,
        ),
    )
    return {"run_id": run_id}


@router.get("/runs/{run_id}", response_model=RunSnapshot)
def get_run(
    run_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> RunSnapshot:
    record = _assert_run_access(session, run_id, user_id)
    return _build_run_snapshot(session, record)


@router.get("/runs/{run_id}/events")
async def stream_run_events(
    run_id: str,
    user_id: str = Depends(get_current_user_id_sse),
) -> StreamingResponse:
    with Session(database.engine) as session:
        _assert_run_access(session, run_id, user_id)

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
