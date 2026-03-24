from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Column, JSON, UniqueConstraint
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "app_user"

    id: str = Field(primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=utcnow)


class Sandbox(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    owner_user_id: str = Field(foreign_key="app_user.id", index=True)
    canvas_state: dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class SandboxNode(SQLModel, table=True):
    """Queryable mirror of agent + collector nodes (see canvas_state JSON source of truth)."""

    __tablename__ = "sandboxnode"

    id: Optional[int] = Field(default=None, primary_key=True)
    sandbox_id: str = Field(foreign_key="sandbox.id", index=True)
    node_id: str
    kind: str = Field(index=True)
    data: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON, nullable=True))

    __table_args__ = (UniqueConstraint("sandbox_id", "node_id", name="uq_sandboxnode_sandbox_node"),)


class SandboxEdge(SQLModel, table=True):
    """Queryable mirror of edges."""

    __tablename__ = "sandboxedge"

    id: Optional[int] = Field(default=None, primary_key=True)
    sandbox_id: str = Field(foreign_key="sandbox.id", index=True)
    source_id: str = Field(index=True)
    target_id: str = Field(index=True)


class RunRecord(SQLModel, table=True):
    __tablename__ = "runrecord"
    run_id: str = Field(primary_key=True)
    sandbox_id: str = Field(foreign_key="sandbox.id", index=True)
    status: str
    error: Optional[str] = None
    prompt: str
    collector_output: Optional[dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    created_at: datetime = Field(default_factory=utcnow)
    completed_at: Optional[datetime] = None


class RunNodeOutput(SQLModel, table=True):
    __tablename__ = "runnodeoutput"
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: str = Field(foreign_key="runrecord.run_id", index=True)
    node_id: str
    output: dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))

    __table_args__ = (UniqueConstraint("run_id", "node_id", name="uq_run_node_output"),)
