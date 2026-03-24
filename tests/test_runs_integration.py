"""Live FastAPI ``/runs`` + SSE smoke (PydanticAI under the hood)."""

from __future__ import annotations

import os
import sys

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration


@pytest.fixture
def client() -> TestClient:
    from backend_or_api.app.main import app

    return TestClient(app)


def _run_payload() -> dict:
    return {
        "sandbox_id": "pytest",
        "prompt": "Say hi in 3 words or fewer.",
        "graph": {
            "nodes": [
                {
                    "id": "a1",
                    "name": "Greeter",
                    "role": "You are a terse assistant.",
                    "provider": "openai",
                    "model": "gpt-4o-mini",
                    "output_key": "message",
                    "output_type": "text",
                    "temperature": 0,
                }
            ],
            "edges": [],
            "collector": {"id": "collector", "name": "Collector", "kind": "collector"},
            "global_context": {},
        },
    }


def test_post_run_completes(client: TestClient) -> None:
    if sys.version_info < (3, 10):
        pytest.skip("PydanticAI requires Python 3.10+")
    if not os.environ.get("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY not set")

    r = client.post("/runs", json=_run_payload())
    assert r.status_code == 200
    run_id = r.json()["run_id"]

    import time

    for _ in range(60):
        snap = client.get(f"/runs/{run_id}").json()
        if snap["status"] in ("done", "failed"):
            break
        time.sleep(0.25)
    assert snap["status"] == "done", snap
    assert "a1" in snap.get("outputs", {})


def test_run_sse_receives_events(client: TestClient) -> None:
    if sys.version_info < (3, 10):
        pytest.skip("PydanticAI requires Python 3.10+")
    if not os.environ.get("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY not set")

    r = client.post("/runs", json=_run_payload())
    run_id = r.json()["run_id"]

    chunks: list[str] = []
    with client.stream("GET", f"/runs/{run_id}/events") as resp:
        assert resp.status_code == 200
        for line in resp.iter_lines():
            if not line:
                continue
            if isinstance(line, bytes):
                line = line.decode("utf-8")
            chunks.append(line)
            blob = "\n".join(chunks)
            if "run_complete" in blob or "node_start" in blob:
                break
            if len(chunks) > 300:
                break

    blob = "\n".join(chunks)
    assert "data:" in blob
    assert "node_start" in blob or "run_complete" in blob or "token_chunk" in blob
