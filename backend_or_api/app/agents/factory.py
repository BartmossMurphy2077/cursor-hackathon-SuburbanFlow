from __future__ import annotations

from ..config import Settings
from ..models import AgentNode
from .base import BaseSandboxAgent
from .pydantic_sandbox_agent import PydanticAISandboxAgent


def create_sandbox_agent(node: AgentNode, settings: Settings) -> BaseSandboxAgent:
    """All sandbox nodes run through PydanticAI (OpenAI or Anthropic model + structured output)."""
    return PydanticAISandboxAgent(node, settings)
