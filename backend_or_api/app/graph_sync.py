from __future__ import annotations

from sqlmodel import Session, select

from .db_models import SandboxEdge, SandboxNode
from .models import PipelineGraph


def sync_sandbox_projection(session: Session, sandbox_id: str, graph: PipelineGraph) -> None:
    """Keep normalized node/edge rows in sync with canvas_state (same transaction as caller)."""
    for row in session.exec(select(SandboxNode).where(SandboxNode.sandbox_id == sandbox_id)).all():
        session.delete(row)
    for row in session.exec(select(SandboxEdge).where(SandboxEdge.sandbox_id == sandbox_id)).all():
        session.delete(row)
    session.flush()

    for node in graph.nodes:
        session.add(
            SandboxNode(
                sandbox_id=sandbox_id,
                node_id=node.id,
                kind="agent",
                data=node.model_dump(mode="json"),
            ),
        )
    c = graph.collector
    session.add(
        SandboxNode(
            sandbox_id=sandbox_id,
            node_id=c.id,
            kind="collector",
            data=c.model_dump(mode="json"),
        ),
    )
    for edge in graph.edges:
        session.add(
            SandboxEdge(
                sandbox_id=sandbox_id,
                source_id=edge.source,
                target_id=edge.target,
            ),
        )
