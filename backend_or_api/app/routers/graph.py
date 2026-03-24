from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from ..models import PipelineGraph
from ..services.dag import topological_layers

router = APIRouter(prefix="/graph", tags=["graph"])


class GraphValidationResult(BaseModel):
    valid: bool
    layers: Optional[list[list[str]]] = None
    error: Optional[str] = None


@router.post("/validate", response_model=GraphValidationResult)
async def validate_graph(payload: PipelineGraph) -> GraphValidationResult:
    try:
        layers = topological_layers(payload)
        return GraphValidationResult(valid=True, layers=layers)
    except ValueError as exc:
        return GraphValidationResult(valid=False, error=str(exc))
