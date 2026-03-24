from __future__ import annotations

import asyncio
import json
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlmodel import Session, select

from . import database
from .auth_utils import create_access_token, hash_password, verify_password
from .database import get_session, init_db
from .db_models import RunNodeOutput, RunRecord, Sandbox, SandboxEdge, SandboxNode, User
from .deps import get_current_user_id, get_current_user_id_sse, require_sandbox_owner
from .executor import run_dag_pipeline
from .graph_sync import sync_sandbox_projection
from .graph_validate import validate_pipeline_graph
from .models import (
    PipelineGraph,
    ResumeRunBody,
    RunRequest,
    RunSnapshot,
    RunSummary,
    SandboxCreate,
    SandboxEdgePublic,
    SandboxNodePublic,
    SandboxPublic,
    SandboxUpdate,
    TokenResponse,
    UserLogin,
    UserRegister,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _sandbox_to_public(row: Sandbox) -> SandboxPublic:
    return SandboxPublic(
        id=row.id,
        name=row.name,
        description=row.description,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


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


RUN_QUEUES: dict[str, list[asyncio.Queue[dict[str, Any]]]] = defaultdict(list)


async def _broadcast_event(run_id: str, event: dict[str, Any]) -> None:
    for queue in list(RUN_QUEUES[run_id]):
        await queue.put(event)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="AgentCanvas MVP API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
async def root() -> FileResponse:
    return FileResponse("frontend/index.html")


# --- Auth ---


@app.post("/auth/register", response_model=TokenResponse)
def register(payload: UserRegister, session: Session = Depends(get_session)) -> TokenResponse:
    if session.exec(select(User).where(User.email == payload.email)).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id))


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: UserLogin, session: Session = Depends(get_session)) -> TokenResponse:
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(user.id))


# --- Sandboxes ---


@app.post("/sandboxes", response_model=SandboxPublic)
def create_sandbox(
    payload: SandboxCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> SandboxPublic:
    sandbox_id = str(uuid.uuid4())
    empty_canvas = PipelineGraph().model_dump(mode="json")
    row = Sandbox(
        id=sandbox_id,
        name=payload.name,
        description=payload.description,
        owner_user_id=user_id,
        canvas_state=empty_canvas,
    )
    session.add(row)
    session.flush()
    sync_sandbox_projection(session, sandbox_id, PipelineGraph.model_validate(empty_canvas))
    session.commit()
    session.refresh(row)
    return _sandbox_to_public(row)


@app.get("/sandboxes", response_model=list[SandboxPublic])
def list_sandboxes(
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> list[SandboxPublic]:
    rows = session.exec(
        select(Sandbox)
        .where(Sandbox.owner_user_id == user_id)
        .order_by(Sandbox.updated_at.desc()),
    ).all()
    return [_sandbox_to_public(r) for r in rows]


@app.get("/sandboxes/{sandbox_id}", response_model=SandboxPublic)
def get_sandbox(
    sandbox_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> SandboxPublic:
    row = require_sandbox_owner(session, sandbox_id, user_id)
    return _sandbox_to_public(row)


@app.patch("/sandboxes/{sandbox_id}", response_model=SandboxPublic)
def update_sandbox(
    sandbox_id: str,
    payload: SandboxUpdate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> SandboxPublic:
    row = require_sandbox_owner(session, sandbox_id, user_id)
    if payload.name is not None:
        row.name = payload.name
    if payload.description is not None:
        row.description = payload.description
    row.updated_at = _utcnow()
    session.add(row)
    session.commit()
    session.refresh(row)
    return _sandbox_to_public(row)


@app.delete("/sandboxes/{sandbox_id}", status_code=204)
def delete_sandbox(
    sandbox_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> None:
    row = require_sandbox_owner(session, sandbox_id, user_id)
    run_rows = session.exec(
        select(RunRecord).where(RunRecord.sandbox_id == sandbox_id),
    ).all()
    for run in run_rows:
        for out in session.exec(
            select(RunNodeOutput).where(RunNodeOutput.run_id == run.run_id),
        ).all():
            session.delete(out)
        session.delete(run)
    for sn in session.exec(
        select(SandboxNode).where(SandboxNode.sandbox_id == sandbox_id),
    ).all():
        session.delete(sn)
    for se in session.exec(
        select(SandboxEdge).where(SandboxEdge.sandbox_id == sandbox_id),
    ).all():
        session.delete(se)
    session.delete(row)
    session.commit()


@app.get("/sandboxes/{sandbox_id}/graph", response_model=PipelineGraph)
def get_sandbox_graph(
    sandbox_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> PipelineGraph:
    sbox = require_sandbox_owner(session, sandbox_id, user_id)
    return PipelineGraph.model_validate(sbox.canvas_state)


@app.patch("/sandboxes/{sandbox_id}/graph", response_model=PipelineGraph)
def patch_sandbox_graph(
    sandbox_id: str,
    graph: PipelineGraph,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> PipelineGraph:
    row = require_sandbox_owner(session, sandbox_id, user_id)
    validate_pipeline_graph(graph)
    row.canvas_state = graph.model_dump(mode="json")
    row.updated_at = _utcnow()
    session.add(row)
    session.flush()
    sync_sandbox_projection(session, sandbox_id, graph)
    session.commit()
    session.refresh(row)
    return PipelineGraph.model_validate(row.canvas_state)


@app.get("/sandboxes/{sandbox_id}/nodes", response_model=list[SandboxNodePublic])
def list_sandbox_nodes(
    sandbox_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> list[SandboxNodePublic]:
    require_sandbox_owner(session, sandbox_id, user_id)
    rows = session.exec(
        select(SandboxNode)
        .where(SandboxNode.sandbox_id == sandbox_id)
        .order_by(SandboxNode.node_id),
    ).all()
    return [SandboxNodePublic(node_id=r.node_id, kind=r.kind) for r in rows]


@app.get("/sandboxes/{sandbox_id}/edges", response_model=list[SandboxEdgePublic])
def list_sandbox_edges(
    sandbox_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> list[SandboxEdgePublic]:
    require_sandbox_owner(session, sandbox_id, user_id)
    rows = session.exec(
        select(SandboxEdge).where(SandboxEdge.sandbox_id == sandbox_id),
    ).all()
    return [
        SandboxEdgePublic(source_id=r.source_id, target_id=r.target_id) for r in rows
    ]


@app.get("/sandboxes/{sandbox_id}/runs", response_model=list[RunSummary])
def list_sandbox_runs(
    sandbox_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> list[RunSummary]:
    require_sandbox_owner(session, sandbox_id, user_id)
    runs = session.exec(
        select(RunRecord)
        .where(RunRecord.sandbox_id == sandbox_id)
        .order_by(RunRecord.created_at.desc()),
    ).all()
    return [
        RunSummary(
            run_id=r.run_id,
            sandbox_id=r.sandbox_id,
            status=r.status,  # type: ignore[arg-type]
            created_at=r.created_at,
            completed_at=r.completed_at,
            error=r.error,
        )
        for r in runs
    ]


# --- Runs ---


@app.post("/runs")
async def start_run(
    payload: RunRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
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

    graph_snapshot = payload.graph.model_copy()
    exec_prompt = payload.prompt

    async def execute() -> None:
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
            await run_dag_pipeline(graph_snapshot, exec_prompt, on_event)
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

    asyncio.create_task(execute())
    return {"run_id": run_id}


@app.post("/runs/{run_id}/resume")
async def resume_run(
    run_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
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

    graph_snapshot = graph.model_copy()

    async def execute() -> None:
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
                graph_snapshot,
                prompt,
                on_event,
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

    asyncio.create_task(execute())
    return {"run_id": run_id}


@app.get("/runs/{run_id}", response_model=RunSnapshot)
def get_run(
    run_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> RunSnapshot:
    record = _assert_run_access(session, run_id, user_id)
    return _build_run_snapshot(session, record)


@app.get("/runs/{run_id}/events")
async def stream_run_events(
    run_id: str,
    user_id: str = Depends(get_current_user_id_sse),
) -> StreamingResponse:
    with Session(database.engine) as session:
        _assert_run_access(session, run_id, user_id)

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
