from __future__ import annotations

from typing import AsyncIterator, Optional

try:
    import anthropic
except ImportError:  # pragma: no cover
    anthropic = None  # type: ignore


class AnthropicLLMClient:
    """Anthropic Messages API — streaming and completion."""

    def __init__(self, api_key: Optional[str]) -> None:
        self._api_key = api_key

    def _require_sdk(self) -> None:
        if anthropic is None:
            raise RuntimeError('Install the "anthropic" package to use Anthropic agents.')
        if not self._api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set. Add it to .env or the environment.")

    async def stream_text(
        self,
        *,
        system: str,
        user: str,
        model: str,
        temperature: float,
    ) -> AsyncIterator[str]:
        self._require_sdk()
        client = anthropic.AsyncAnthropic(api_key=self._api_key)
        async with client.messages.stream(
            model=model,
            max_tokens=8192,
            system=system,
            temperature=temperature,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            async for text in stream.text_stream:
                if text:
                    yield text

    async def complete_text(
        self,
        *,
        system: str,
        user: str,
        model: str,
        temperature: float,
    ) -> str:
        self._require_sdk()
        client = anthropic.AsyncAnthropic(api_key=self._api_key)
        message = await client.messages.create(
            model=model,
            max_tokens=8192,
            system=system,
            temperature=temperature,
            messages=[{"role": "user", "content": user}],
        )
        parts: list[str] = []
        for block in message.content:
            if getattr(block, "type", None) == "text":
                parts.append(block.text)
        return "".join(parts)
