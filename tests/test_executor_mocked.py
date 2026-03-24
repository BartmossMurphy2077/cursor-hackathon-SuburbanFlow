import pytest

from backend_or_api.app.config import Settings
from backend_or_api.app.models import AgentNode, Edge, PipelineGraph
from backend_or_api.app.services import executor as executor_mod
from backend_or_api.app.services.executor import run_dag_pipeline


class _FakeAgent:
    def __init__(self, node: AgentNode) -> None:
        self._node = node

    async def run(self, user_prompt, upstream_outputs, global_context, on_chunk):
        await on_chunk(f"[{self._node.id}]")
        merged = {**upstream_outputs}
        return {self._node.output_key: f"out-{self._node.id}-{user_prompt[:3]}-{merged!r}"}


@pytest.fixture
def fake_settings() -> Settings:
    return Settings(
        anthropic_api_key=None,
        openai_api_key=None,
        default_anthropic_model="dummy-anthropic",
        default_openai_model="dummy-openai",
    )


@pytest.mark.asyncio
async def test_run_dag_pipeline_mocked(monkeypatch, fake_settings: Settings) -> None:
    def _factory(node: AgentNode, settings: Settings):
        assert settings is fake_settings
        return _FakeAgent(node)

    monkeypatch.setattr(executor_mod, "create_sandbox_agent", _factory)

    graph = PipelineGraph(
        nodes=[
            AgentNode(id="n1", name="One", role="sys1", provider="openai"),
            AgentNode(id="n2", name="Two", role="sys2", provider="openai"),
        ],
        edges=[Edge(source="n1", target="n2")],
    )
    events: list[dict] = []

    async def on_event(e: dict):
        events.append(e)

    outputs, judge_hist = await run_dag_pipeline(
        graph, "hi", on_event, fake_settings
    )

    assert "n1" in outputs and "n2" in outputs
    assert judge_hist == {}
    types = [e["type"] for e in events]
    assert types.count("node_start") == 2
    assert types.count("node_complete") == 2
    assert "run_complete" in types
