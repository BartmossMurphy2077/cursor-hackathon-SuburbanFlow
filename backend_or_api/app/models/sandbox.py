from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


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


class SandboxNodePublic(BaseModel):
    node_id: str
    kind: str


class SandboxEdgePublic(BaseModel):
    source_id: str
    target_id: str
