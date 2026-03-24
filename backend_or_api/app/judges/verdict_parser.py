from __future__ import annotations

import re

from ..models import JudgeVerdict


def strip_markdown_fences(text: str) -> str:
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*([\s\S]*?)```\s*$", text)
    if match:
        return match.group(1).strip()
    return text


def parse_judge_verdict(raw: str) -> JudgeVerdict:
    body = strip_markdown_fences(raw)
    return JudgeVerdict.model_validate_json(body)
