from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class JudgeVerdict(BaseModel):
    """Structured output from an LLM judge."""

    passed: bool
    score: float = Field(ge=0.0, le=1.0, description="Quality score 0–1")
    feedback: str = ""


class JudgeConfig(BaseModel):
    """Optional quality gate after a sandbox agent node completes."""

    enabled: bool = True
    criteria: str = Field(
        default="Evaluate completeness, factual consistency, and usefulness for downstream agents.",
        description="Natural-language rubric for the judge.",
    )
    provider: Literal["anthropic", "openai"] = "anthropic"
    model: Optional[str] = Field(
        default=None,
        description="Override model; defaults from Settings per provider if omitted.",
    )
    min_score: float = Field(default=0.65, ge=0.0, le=1.0)
    max_retries: int = Field(default=2, ge=0, le=10)
