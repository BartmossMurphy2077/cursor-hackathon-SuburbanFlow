from __future__ import annotations

from typing import NoReturn

from fastapi import HTTPException

from .models.graph import PipelineGraph


def _http422(msg: str) -> NoReturn:
    raise HTTPException(status_code=422, detail=msg)


def validate_pipeline_graph(graph: PipelineGraph) -> None:
    """Reject invalid graphs early (stable API + less executor noise)."""
    node_ids: set[str] = {n.id for n in graph.nodes}
    if len(node_ids) != len(graph.nodes):
        _http422("Duplicate agent node id")

    collector = graph.collector
    all_ids = node_ids | {collector.id}

    collector_incoming = 0

    for e in graph.edges:
        if e.source == e.target:
            _http422(f"Edge cannot be self-loop: {e.source}")
        if e.source not in all_ids:
            _http422(f"Edge source not found: {e.source}")
        if e.target not in all_ids:
            _http422(f"Edge target not found: {e.target}")

        if e.source == collector.id:
            _http422("Collector cannot be an edge source")

        if e.target == collector.id:
            if e.source not in node_ids:
                _http422("Collector can only receive edges from agent nodes")
            collector_incoming += 1

    if collector_incoming == 0:
        _http422("Collector must have at least one direct incoming edge")

    try:
        from .services.dag import topological_layers

        topological_layers(graph)
    except ValueError as exc:
        _http422(str(exc))
