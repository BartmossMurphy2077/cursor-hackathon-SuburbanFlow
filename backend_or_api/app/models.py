from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class Edge(BaseModel):
    source: str
    target: str


class AgentNode(BaseModel):
    id: str
    name: str
    role: str
    output_key: str = "text"
    output_type: Literal["text", "json"] = "text"


class CollectorNode(BaseModel):
    id: str = "collector"
    name: str = "Collector"
    kind: Literal["collector"] = "collector"


class PipelineGraph(BaseModel):
    nodes: list[AgentNode] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)
    collector: CollectorNode = Field(default_factory=CollectorNode)
    global_context: dict[str, Any] = Field(default_factory=dict)


class RunRequest(BaseModel):
    sandbox_id: str
    graph: PipelineGraph
    prompt: str


class NodeOutput(BaseModel):
    node_id: str
    output: dict[str, Any]


class RunSnapshot(BaseModel):
    run_id: str
    status: Literal["pending", "running", "done", "failed"]
    outputs: dict[str, dict[str, Any]] = Field(default_factory=dict)
    error: Optional[str] = None

