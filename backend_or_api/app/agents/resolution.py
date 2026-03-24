from __future__ import annotations

from ..config import Settings
from ..models import AgentNode


def resolve_model_for_node(node: AgentNode, settings: Settings) -> str:
    if node.model:
        return node.model
    if node.provider == "anthropic":
        return settings.default_anthropic_model
    return settings.default_openai_model
