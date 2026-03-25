from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete
from sqlmodel import Session, select
from starlette.responses import Response

from ..database import get_session
from ..db_models import RunNodeOutput, RunRecord, Sandbox, SandboxEdge, SandboxNode
from ..deps import get_current_user_id, require_sandbox_owner
from ..graph_sync import sync_sandbox_projection
from ..graph_validate import validate_pipeline_graph
from ..models import (
    PipelineGraph,
    RunSummary,
    SandboxCreate,
    SandboxEdgePublic,
    SandboxNodePublic,
    SandboxPublic,
    SandboxUpdate,
)

router = APIRouter(prefix="/sandboxes", tags=["sandboxes"])


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


@router.post("", response_model=SandboxPublic)
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


@router.get("", response_model=list[SandboxPublic])
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


@router.get("/{sandbox_id}", response_model=SandboxPublic)
def get_sandbox(
    sandbox_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> SandboxPublic:
    row = require_sandbox_owner(session, sandbox_id, user_id)
    return _sandbox_to_public(row)


@router.patch("/{sandbox_id}", response_model=SandboxPublic)
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


@router.delete("/{sandbox_id}", status_code=204)
def delete_sandbox(
    sandbox_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> Response:
    row = require_sandbox_owner(session, sandbox_id, user_id)
    run_ids = select(RunRecord.run_id).where(RunRecord.sandbox_id == sandbox_id)
    session.exec(delete(RunNodeOutput).where(RunNodeOutput.run_id.in_(run_ids)))  # type: ignore[union-attr]
    session.exec(delete(RunRecord).where(RunRecord.sandbox_id == sandbox_id))  # type: ignore[call-overload]
    session.exec(delete(SandboxNode).where(SandboxNode.sandbox_id == sandbox_id))  # type: ignore[call-overload]
    session.exec(delete(SandboxEdge).where(SandboxEdge.sandbox_id == sandbox_id))  # type: ignore[call-overload]
    session.delete(row)
    session.commit()
    return Response(status_code=204)


@router.get("/{sandbox_id}/graph", response_model=PipelineGraph)
def get_sandbox_graph(
    sandbox_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Session = Depends(get_session),
) -> PipelineGraph:
    sbox = require_sandbox_owner(session, sandbox_id, user_id)
    return PipelineGraph.model_validate(sbox.canvas_state)


@router.patch("/{sandbox_id}/graph", response_model=PipelineGraph)
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


@router.get("/{sandbox_id}/nodes", response_model=list[SandboxNodePublic])
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


@router.get("/{sandbox_id}/edges", response_model=list[SandboxEdgePublic])
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


@router.get("/{sandbox_id}/runs", response_model=list[RunSummary])
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
