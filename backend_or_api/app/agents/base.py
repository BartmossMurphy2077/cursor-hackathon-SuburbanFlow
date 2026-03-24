from __future__ import annotations

import json
from typing import Any, Awaitable, Callable

from ..models import AgentNode


class BaseSandboxAgent:
    """
    Canvas agent backed by a PydanticAI ``Agent`` (structured outputs + streaming).

    See https://ai.pydantic.dev/agent/ and https://ai.pydantic.dev/output/
    """

    def __init__(self, node: AgentNode, pai_agent: Any) -> None:
        self._node = node
        self._pai_agent = pai_agent

    @property
    def node(self) -> AgentNode:
        return self._node

    def _build_user_message(
        self,
        user_prompt: str,
        upstream_outputs: dict[str, Any],
        global_context: dict[str, Any],
    ) -> str:
        parts: list[str] = [f"User task / instruction:\n{user_prompt}"]
        if global_context:
            parts.append(
                "Shared sandbox context (JSON-serializable):\n"
                f"{json.dumps(global_context, default=str)}"
            )
        if upstream_outputs:
            parts.append(
                "Upstream agent outputs (by source node id):\n"
                f"{json.dumps(upstream_outputs, default=str)}"
            )
        if self._node.output_type == "json":
            parts.append(
                "Produce a single JSON object matching the expected schema "
                "(arbitrary keys allowed in the object)."
            )
        return "\n\n".join(parts)

    async def run(
        self,
        *,
        user_prompt: str,
        upstream_outputs: dict[str, Any],
        global_context: dict[str, Any],
        on_chunk: Callable[[str], Awaitable[None]],
    ) -> dict[str, Any]:
        user_message = self._build_user_message(user_prompt, upstream_outputs, global_context)

        async with self._pai_agent.run_stream(user_message) as run:
            if self._node.output_type == "text":
                async for text in run.stream_text(delta=True, debounce_by=None):
                    await on_chunk(text)
            else:
                async for partial in run.stream_output(debounce_by=None):
                    await on_chunk(json.dumps(partial, default=str) + "\n")

            output_data = await run.get_output()

        return {self._node.output_key: output_data}
