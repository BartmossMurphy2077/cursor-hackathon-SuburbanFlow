from __future__ import annotations

import sys
from typing import Any, Type, Union

from ..agents.resolution import resolve_model_for_node
from ..config import Settings
from ..models import AgentNode, JudgeConfig, JudgeVerdict


def _ensure_py310() -> None:
    if sys.version_info < (3, 10):
        raise RuntimeError(
            "PydanticAI is used for agents and judges but requires Python 3.10+. "
            "Run via Docker (see Dockerfile) or use a 3.10+ interpreter. "
            "Docs: https://ai.pydantic.dev/install/"
        )


def _openai_model(settings: Settings, model_name: str) -> Any:
    from pydantic_ai.models.openai import OpenAIChatModel
    from pydantic_ai.providers.openai import OpenAIProvider

    key = settings.openai_api_key
    if not key:
        raise RuntimeError("OpenAI provider selected but OPENAI_API_KEY is not set.")
    return OpenAIChatModel(model_name, provider=OpenAIProvider(api_key=key))


def _anthropic_model(settings: Settings, model_name: str) -> Any:
    from pydantic_ai.models.anthropic import AnthropicModel
    from pydantic_ai.providers.anthropic import AnthropicProvider

    key = settings.anthropic_api_key
    if not key:
        raise RuntimeError("Anthropic provider selected but ANTHROPIC_API_KEY is not set.")
    return AnthropicModel(model_name, provider=AnthropicProvider(api_key=key))


def _resolve_judge_model_name(config: JudgeConfig, settings: Settings) -> str:
    if config.model:
        return config.model
    if config.provider == "anthropic":
        return settings.default_anthropic_model
    return settings.default_openai_model


def _output_type_for_node(node: AgentNode) -> Union[Type[str], Type[dict[str, Any]]]:
    if node.output_type == "json":
        return dict
    return str


def build_canvas_agent(node: AgentNode, settings: Settings) -> Any:
    """
    Build a PydanticAI ``Agent`` for one canvas node.

    Uses structured ``output_type`` (``str`` or ``dict``) per
    https://ai.pydantic.dev/output/
    """
    _ensure_py310()
    from pydantic_ai import Agent
    from pydantic_ai.settings import ModelSettings

    model_name = resolve_model_for_node(node, settings)
    if node.provider == "openai":
        model = _openai_model(settings, model_name)
    elif node.provider == "anthropic":
        model = _anthropic_model(settings, model_name)
    else:
        raise ValueError(f"Unknown provider: {node.provider}")

    return Agent(
        model,
        instructions=node.role,
        output_type=_output_type_for_node(node),
        model_settings=ModelSettings(temperature=node.temperature),
    )


def build_judge_agent(config: JudgeConfig, settings: Settings) -> Any:
    """Judge as ``Agent`` with ``output_type=JudgeVerdict`` (validated Pydantic model)."""
    _ensure_py310()
    from pydantic_ai import Agent
    from pydantic_ai.settings import ModelSettings

    model_name = _resolve_judge_model_name(config, settings)
    if config.provider == "openai":
        model = _openai_model(settings, model_name)
    else:
        model = _anthropic_model(settings, model_name)

    return Agent(
        model,
        instructions=(
            "You are an impartial evaluator. "
            "Score how well the given output satisfies the criteria. "
            "Be strict but fair. Always fill every field of the verdict schema."
        ),
        output_type=JudgeVerdict,
        model_settings=ModelSettings(temperature=0.2),
    )
