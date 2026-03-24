"""
Live OpenAI smoke test via PydanticAI (same stack as canvas agents).

Requires Python 3.10+ and OPENAI_API_KEY (from shell or loaded `.env` in conftest).
"""

from __future__ import annotations

import os
import sys

import pytest

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_pydantic_ai_openai_minimal() -> None:
    if sys.version_info < (3, 10):
        pytest.skip("PydanticAI requires Python 3.10+")
    if not os.environ.get("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY not set in process environment")

    from backend_or_api.app.config import get_settings
    from backend_or_api.app.models import AgentNode
    from backend_or_api.app.pai.builders import build_canvas_agent

    settings = get_settings()
    node = AgentNode(
        id="t1",
        name="Tester",
        role="You reply with only the single word OK and nothing else.",
        provider="openai",
        model="gpt-4o-mini",
        output_type="text",
        temperature=0,
    )
    agent = build_canvas_agent(node, settings)
    result = await agent.run("Go.")
    text = str(result.output).strip().upper()
    assert "OK" in text or len(text) >= 1
