from __future__ import annotations

from typing import NoReturn

from fastapi import HTTPException

from .models import PipelineGraph


def _http422(msg: str) -> NoReturn:
    raise HTTPException(status_code=422, detail=msg)


def validate_pipeline_graph(graph: PipelineGraph) -> None:
    """Reject invalid graphs early (stable API + less executor noise)."""
    node_ids: set[str] = {n.id for n in graph.nodes}
    if len(node_ids) != len(graph.nodes):
        _http422("Duplicate agent node id")

    collector = graph.collector
    all_ids = node_ids | {collector.id}

    for e in graph.edges:
        if e.source == e.target:
            _http422(f"Edge cannot be self-loop: {e.source}")
        if e.source not in all_ids:
            _http422(f"Edge source not found: {e.source}")
        if e.target not in all_ids:
            _http422(f"Edge target not found: {e.target}")

    try:
        from .executor import _topological_layers

        _topological_layers(graph)
    except ValueError as exc:
        _http422(str(exc))
