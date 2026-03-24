from __future__ import annotations

from typing import Any, AsyncIterator, Protocol, runtime_checkable


@runtime_checkable
class LLMClient(Protocol):
    """Abstraction for provider-specific LLM calls (Dependency Inversion)."""

    async def stream_text(
        self,
        *,
        system: str,
        user: str,
        model: str,
        temperature: float,
    ) -> AsyncIterator[str]:
        """Yield token/text fragments as they arrive."""
        ...

    async def complete_text(
        self,
        *,
        system: str,
        user: str,
        model: str,
        temperature: float,
    ) -> str:
        """Single non-streaming completion (e.g. judge, structured prompts)."""
        ...


class StreamChunkCallback(Protocol):
    async def __call__(self, chunk: str) -> Any:
        ...
