from __future__ import annotations

from fastapi import APIRouter, Depends

from ..config import Settings, get_settings

router = APIRouter(tags=["meta"])


@router.get("/providers")
async def providers(settings: Settings = Depends(get_settings)) -> dict[str, bool]:
    """Which LLM providers are configured (keys present). Never exposes secrets."""
    return {
        "anthropic_configured": bool(settings.anthropic_api_key),
        "openai_configured": bool(settings.openai_api_key),
    }


@router.get("/models/defaults")
async def default_models(settings: Settings = Depends(get_settings)) -> dict[str, str]:
    return {
        "anthropic": settings.default_anthropic_model,
        "openai": settings.default_openai_model,
    }
