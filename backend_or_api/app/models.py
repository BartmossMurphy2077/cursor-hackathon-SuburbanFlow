from __future__ import annotations

from datetime import datetime
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
    collector_output: Optional[dict[str, Any]] = None


class SandboxCreate(BaseModel):
    name: str
    description: Optional[str] = None


class SandboxUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SandboxPublic(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RunSummary(BaseModel):
    run_id: str
    sandbox_id: str
    status: Literal["pending", "running", "done", "failed"]
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class UserRegister(BaseModel):
    email: str
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ResumeRunBody(BaseModel):
    """Override prompt when resuming; defaults to the original run prompt."""

    prompt: Optional[str] = None


class SandboxNodePublic(BaseModel):
    node_id: str
    kind: str


class SandboxEdgePublic(BaseModel):
    source_id: str
    target_id: str

