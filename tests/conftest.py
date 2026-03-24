"""
Test fixtures.

Loads `.env` from the repository root (via python-dotenv) before tests run so
integration tests can use OPENAI_API_KEY / ANTHROPIC_API_KEY without manual export.
Shell-defined variables still win (`override=False`).
"""

from __future__ import annotations

from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # type: ignore[misc, assignment]

_REPO_ROOT = Path(__file__).resolve().parent.parent

if load_dotenv is not None:
    env_file = _REPO_ROOT / ".env"
    if env_file.is_file():
        load_dotenv(env_file, override=False)

    # Settings is cached; clear so the first resolve sees env vars from .env
    try:
        from backend_or_api.app.config import get_settings

        get_settings.cache_clear()
    except ImportError:
        pass
