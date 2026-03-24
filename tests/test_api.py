from fastapi.testclient import TestClient

from backend_or_api.app.main import app


def test_health() -> None:
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_providers() -> None:
    client = TestClient(app)
    r = client.get("/providers")
    assert r.status_code == 200
    data = r.json()
    assert "anthropic_configured" in data
    assert "openai_configured" in data


def test_graph_validate_ok() -> None:
    client = TestClient(app)
    body = {
        "nodes": [
            {
                "id": "a",
                "name": "A",
                "role": "r",
                "provider": "openai",
                "output_key": "text",
                "output_type": "text",
            },
            {
                "id": "b",
                "name": "B",
                "role": "r",
                "provider": "openai",
                "output_key": "text",
                "output_type": "text",
            },
        ],
        "edges": [{"source": "a", "target": "b"}],
        "collector": {"id": "collector", "name": "Collector", "kind": "collector"},
        "global_context": {},
    }
    r = client.post("/graph/validate", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["valid"] is True
    assert data["layers"] == [["a"], ["b"]]


def test_graph_validate_cycle() -> None:
    client = TestClient(app)
    body = {
        "nodes": [
            {
                "id": "a",
                "name": "A",
                "role": "r",
                "output_key": "text",
                "output_type": "text",
            },
            {
                "id": "b",
                "name": "B",
                "role": "r",
                "output_key": "text",
                "output_type": "text",
            },
        ],
        "edges": [{"source": "a", "target": "b"}, {"source": "b", "target": "a"}],
        "collector": {"id": "collector", "name": "Collector", "kind": "collector"},
        "global_context": {},
    }
    r = client.post("/graph/validate", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["valid"] is False
    assert "error" in data
