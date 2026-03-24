from __future__ import annotations

from collections import defaultdict, deque
from typing import Any

from ..models import AgentNode, PipelineGraph


def topological_layers(graph: PipelineGraph) -> list[list[str]]:
    in_degree: dict[str, int] = {node.id: 0 for node in graph.nodes}
    outgoing: dict[str, list[str]] = defaultdict(list)

    for edge in graph.edges:
        if edge.source in in_degree and edge.target in in_degree:
            outgoing[edge.source].append(edge.target)
            in_degree[edge.target] += 1

    queue = deque([node_id for node_id, degree in in_degree.items() if degree == 0])
    layers: list[list[str]] = []

    while queue:
        current_layer = list(queue)
        layers.append(current_layer)
        queue.clear()

        for node_id in current_layer:
            for target in outgoing[node_id]:
                in_degree[target] -= 1
                if in_degree[target] == 0:
                    queue.append(target)

    visited = sum(len(layer) for layer in layers)
    if visited != len(graph.nodes):
        raise ValueError("Graph contains a cycle; pipeline cannot be executed as a DAG.")

    return layers


def node_map(graph: PipelineGraph) -> dict[str, AgentNode]:
    return {node.id: node for node in graph.nodes}


def upstream_outputs(
    graph: PipelineGraph,
    node_id: str,
    outputs: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for edge in graph.edges:
        if edge.target == node_id and edge.source in outputs:
            data[edge.source] = outputs[edge.source]
    return data
