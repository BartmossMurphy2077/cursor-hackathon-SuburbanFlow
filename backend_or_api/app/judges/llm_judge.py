from __future__ import annotations

import json
from typing import Any

from ..config import Settings
from ..models import JudgeConfig, JudgeVerdict
from ..pai import build_judge_agent


class LLMJudgeService:
    """
    Quality gate using a dedicated PydanticAI agent with ``output_type=JudgeVerdict``.

    Pydantic AI validates the model output against the verdict schema (see
    https://ai.pydantic.dev/output/).
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def evaluate(self, config: JudgeConfig, node_output: dict[str, Any]) -> JudgeVerdict:
        if not config.enabled:
            return JudgeVerdict(passed=True, score=1.0, feedback="Judge disabled.")

        agent = build_judge_agent(config, self._settings)
        prompt = (
            f"Evaluation criteria:\n{config.criteria}\n\n"
            f"Agent output (JSON):\n{json.dumps(node_output, default=str)}"
        )
        result = await agent.run(prompt)
        return result.output
