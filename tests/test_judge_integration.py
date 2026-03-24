"""Optional live judge gate (requires API keys + Python 3.10+)."""

from __future__ import annotations

import os
import sys
import time

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration


def test_run_with_judge_retries_or_passes() -> None:
    if sys.version_info < (3, 10):
        pytest.skip("PydanticAI requires Python 3.10+")
    if not os.environ.get("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY not set")

    from backend_or_api.app.main import app

    client = TestClient(app)
    body = {
        "sandbox_id": "pytest_judge",
        "prompt": "Output one short polite sentence.",
        "graph": {
            "nodes": [
                {
                    "id": "n1",
                    "name": "Writer",
                    "role": "Write exactly one short sentence.",
                    "provider": "openai",
                    "model": "gpt-4o-mini",
                    "output_key": "text",
                    "output_type": "text",
                    "temperature": 0.3,
                    "judge": {
                        "enabled": True,
                        "criteria": "Output must be a full sentence with a subject and verb.",
                        "provider": "openai",
                        "model": "gpt-4o-mini",
                        "min_score": 0.3,
                        "max_retries": 1,
                    },
                }
            ],
            "edges": [],
            "collector": {"id": "collector", "name": "Collector", "kind": "collector"},
            "global_context": {},
        },
    }
    r = client.post("/runs", json=body)
    assert r.status_code == 200
    run_id = r.json()["run_id"]
    for _ in range(80):
        snap = client.get(f"/runs/{run_id}").json()
        if snap["status"] in ("done", "failed"):
            break
        time.sleep(0.25)
    assert snap["status"] == "done", snap.get("error", snap)
