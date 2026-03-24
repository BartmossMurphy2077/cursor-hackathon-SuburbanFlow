from __future__ import annotations

from typing import AsyncIterator, Optional

try:
    from openai import AsyncOpenAI
except ImportError:  # pragma: no cover
    AsyncOpenAI = None  # type: ignore


class OpenAILLMClient:
    """OpenAI Chat Completions — streaming and completion."""

    def __init__(self, api_key: Optional[str]) -> None:
        self._api_key = api_key

    def _require_sdk(self) -> None:
        if AsyncOpenAI is None:
            raise RuntimeError('Install the "openai" package to use OpenAI agents.')
        if not self._api_key:
            raise RuntimeError("OPENAI_API_KEY is not set. Add it to .env or the environment.")

    async def stream_text(
        self,
        *,
        system: str,
        user: str,
        model: str,
        temperature: float,
    ) -> AsyncIterator[str]:
        self._require_sdk()
        client = AsyncOpenAI(api_key=self._api_key)
        stream = await client.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            stream=True,
        )
        async for chunk in stream:
            choice = chunk.choices[0] if chunk.choices else None
            if choice and choice.delta and choice.delta.content:
                yield choice.delta.content

    async def complete_text(
        self,
        *,
        system: str,
        user: str,
        model: str,
        temperature: float,
    ) -> str:
        self._require_sdk()
        client = AsyncOpenAI(api_key=self._api_key)
        response = await client.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        choice = response.choices[0] if response.choices else None
        content = choice.message.content if choice and choice.message else ""
        return content or ""
