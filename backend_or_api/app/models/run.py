from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from .graph import PipelineGraph


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
    judge_summaries: dict[str, list[dict[str, Any]]] = Field(
        default_factory=dict,
        description="Per-node judge verdict history (optional).",
    )
