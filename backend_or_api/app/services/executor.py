from __future__ import annotations

import asyncio
from typing import Any, Awaitable, Callable, Optional

from ..agents import create_sandbox_agent
from ..config import Settings
from ..judges import LLMJudgeService
from ..models import AgentNode, JudgeConfig, PipelineGraph
from .dag import node_map, topological_layers, upstream_outputs

OnEvent = Callable[[dict[str, Any]], Awaitable[None]]


async def _run_node_with_optional_judge(
    *,
    graph: PipelineGraph,
    node_id: str,
    node_lookup: dict[str, AgentNode],
    outputs: dict[str, dict[str, Any]],
    prompt: str,
    settings: Settings,
    on_event: OnEvent,
    judge_service: LLMJudgeService,
    judge_history: dict[str, list[dict[str, Any]]],
) -> None:
    node = node_lookup[node_id]
    upstream = upstream_outputs(graph, node_id, outputs)
    agent = create_sandbox_agent(node, settings)

    await on_event({"type": "node_start", "node_id": node_id})

    judge_cfg: Optional[JudgeConfig] = node.judge
    max_attempts = (judge_cfg.max_retries + 1) if judge_cfg and judge_cfg.enabled else 1
    attempt_feedback = ""

    final_output: Optional[dict[str, Any]] = None

    for attempt in range(max_attempts):
        async def on_chunk(text: str) -> None:
            await on_event({"type": "token_chunk", "node_id": node_id, "chunk": text})

        user_prompt = prompt
        if attempt_feedback:
            user_prompt = (
                f"{prompt}\n\n"
                f"Previous attempt did not satisfy the judge. Address this feedback:\n{attempt_feedback}"
            )

        try:
            final_output = await agent.run(
                user_prompt=user_prompt,
                upstream_outputs=upstream,
                global_context=graph.global_context,
                on_chunk=on_chunk,
            )
        except Exception as exc:
            await on_event(
                {
                    "type": "node_error",
                    "node_id": node_id,
                    "error": str(exc),
                    "attempt": attempt,
                }
            )
            raise

        if not judge_cfg or not judge_cfg.enabled:
            break

        verdict = await judge_service.evaluate(judge_cfg, final_output)
        verdict_dump = verdict.model_dump()
        judge_history.setdefault(node_id, []).append(
            {"attempt": attempt, **verdict_dump}
        )
        await on_event(
            {
                "type": "judge_verdict",
                "node_id": node_id,
                "attempt": attempt,
                "verdict": verdict_dump,
            }
        )

        if verdict.passed and verdict.score >= judge_cfg.min_score:
            break

        if attempt >= max_attempts - 1:
            await on_event(
                {
                    "type": "node_error",
                    "node_id": node_id,
                    "error": (
                        f"Judge rejected output after {max_attempts} attempt(s). "
                        f"Last score={verdict.score:.2f}."
                    ),
                }
            )
            raise RuntimeError(
                f"Judge gate failed for node {node_id} after {max_attempts} attempts."
            )

        attempt_feedback = verdict.feedback or "Improve quality per criteria."

    if final_output is None:
        raise RuntimeError(f"No output produced for node {node_id}")

    outputs[node_id] = final_output
    await on_event({"type": "node_complete", "node_id": node_id, "output": final_output})


async def run_dag_pipeline(
    graph: PipelineGraph,
    prompt: str,
    on_event: OnEvent,
    settings: Settings,
    *,
    initial_outputs: dict[str, dict[str, Any]] | None = None,
) -> tuple[dict[str, dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    layers = topological_layers(graph)
    node_lookup = node_map(graph)
    outputs: dict[str, dict[str, Any]] = dict(initial_outputs or {})
    judge_history: dict[str, list[dict[str, Any]]] = {}
    judge_service = LLMJudgeService(settings)

    async def run_single(node_id: str) -> None:
        if node_id in outputs:
            await on_event({"type": "node_start", "node_id": node_id, "resumed": True})
            await on_event(
                {"type": "node_complete", "node_id": node_id, "output": outputs[node_id], "resumed": True},
            )
            return
        await _run_node_with_optional_judge(
            graph=graph,
            node_id=node_id,
            node_lookup=node_lookup,
            outputs=outputs,
            prompt=prompt,
            settings=settings,
            on_event=on_event,
            judge_service=judge_service,
            judge_history=judge_history,
        )

    for layer in layers:
        await asyncio.gather(*(run_single(node_id) for node_id in layer))

    collector_output = {"final": outputs, "graph": graph.model_dump()}
    await on_event({"type": "run_complete", "collector_output": collector_output})
    return outputs, judge_history
