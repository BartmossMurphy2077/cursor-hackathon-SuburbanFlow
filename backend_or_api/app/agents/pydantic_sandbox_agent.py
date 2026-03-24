from __future__ import annotations

from ..config import Settings
from ..models import AgentNode
from ..pai import build_canvas_agent
from .base import BaseSandboxAgent


class PydanticAISandboxAgent(BaseSandboxAgent):
    """Single canvas agent implementation: provider + schema come from Pydantic ``AgentNode``."""

    def __init__(self, node: AgentNode, settings: Settings) -> None:
        super().__init__(node, build_canvas_agent(node, settings))
