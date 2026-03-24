from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from typing import Any

from .models import AgentNode, PipelineGraph


def _topological_layers(graph: PipelineGraph) -> list[list[str]]:
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
        raise ValueError("Graph contains a cycle, cannot execute DAG pipeline.")

    return layers


def _node_map(graph: PipelineGraph) -> dict[str, AgentNode]:
    return {node.id: node for node in graph.nodes}


def _upstream_outputs(graph: PipelineGraph, node_id: str, outputs: dict[str, dict[str, Any]]) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for edge in graph.edges:
        if edge.target == node_id and edge.source in outputs:
            data[edge.source] = outputs[edge.source]
    return data


async def _simulate_agent(node: AgentNode, prompt: str, upstream: dict[str, Any]) -> tuple[str, dict[str, Any], list[str]]:
    base_text = (
        f"{node.name} processed prompt '{prompt[:50]}'"
        f" with {len(upstream)} upstream dependencies."
    )
    chunks = [
        f"{node.name}: thinking...",
        f"{node.name}: combining context...",
        f"{node.name}: done.",
    ]
    await asyncio.sleep(0.1)
    output = {node.output_key: base_text}
    return node.id, output, chunks


async def run_dag_pipeline(
    graph: PipelineGraph,
    prompt: str,
    on_event,
) -> dict[str, dict[str, Any]]:
    layers = _topological_layers(graph)
    node_lookup = _node_map(graph)
    outputs: dict[str, dict[str, Any]] = {}

    async def run_single(node_id: str) -> None:
        node = node_lookup[node_id]
        upstream = _upstream_outputs(graph, node_id, outputs)
        await on_event({"type": "node_start", "node_id": node_id})
        _, output, chunks = await _simulate_agent(node, prompt, upstream)
        for chunk in chunks:
            await on_event({"type": "token_chunk", "node_id": node_id, "chunk": chunk})
        outputs[node_id] = output
        await on_event({"type": "node_complete", "node_id": node_id, "output": output})

    for layer in layers:
        await asyncio.gather(*(run_single(node_id) for node_id in layer))

    collector_output = {"final": outputs}
    await on_event({"type": "run_complete", "collector_output": collector_output})
    return outputs

