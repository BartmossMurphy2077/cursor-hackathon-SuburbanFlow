from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from .judge import JudgeConfig


class Edge(BaseModel):
    source: str
    target: str
    source_field: Optional[str] = None
    target_field: Optional[str] = None


class AgentNode(BaseModel):
    """Canvas agent node -> builds a typed sandbox agent at run time."""

    id: str
    name: str
    role: str = Field(description="System instructions / role for the agent.")
    provider: Literal["anthropic", "openai"] = "anthropic"
    model: Optional[str] = Field(
        default=None,
        description="Provider model id; defaults from Settings if omitted.",
    )
    output_key: str = "text"
    output_type: Literal["text", "json"] = "text"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    judge: Optional[JudgeConfig] = None


class CollectorNode(BaseModel):
    id: str = "collector"
    name: str = "Collector"
    kind: Literal["collector"] = "collector"
    role: str = "Synthesize the directly connected agent outputs into one coherent final report."
    provider: Literal["anthropic", "openai"] = "anthropic"
    model: Optional[str] = None
    output_key: str = "final_report"
    output_type: Literal["text", "json"] = "text"
    temperature: float = Field(default=0.4, ge=0.0, le=2.0)


class PipelineGraph(BaseModel):
    nodes: list[AgentNode] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)
    collector: CollectorNode = Field(default_factory=CollectorNode)
    global_context: dict[str, Any] = Field(default_factory=dict)
