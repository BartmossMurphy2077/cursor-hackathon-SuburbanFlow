"""Quick integration test against http://127.0.0.1:8000 (AUTH_DISABLED=1)."""

import json
import time
import urllib.request

BASE = "http://127.0.0.1:8000"


def api(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req)
    if resp.status == 204:
        return None
    return json.loads(resp.read())


print("=== 1. Health ===")
r = api("GET", "/health")
print(r)
assert r == {"status": "ok"}, "Health failed"

print("\n=== 2. Create Sandbox ===")
sb = api("POST", "/sandboxes", {"name": "TestSandbox", "description": "Integration test"})
print(sb)
sid = sb["id"]
assert sb["name"] == "TestSandbox"

print("\n=== 3. List Sandboxes ===")
sbs = api("GET", "/sandboxes")
names = [s["name"] for s in sbs]
print(f"  Count: {len(sbs)}, names: {names}")
assert any(s["id"] == sid for s in sbs)

print("\n=== 4. Get Sandbox ===")
s = api("GET", f"/sandboxes/{sid}")
print(f"  id={s['id']}, name={s['name']}")

print("\n=== 5. Patch Sandbox ===")
s2 = api("PATCH", f"/sandboxes/{sid}", {"name": "Renamed"})
print(f"  New name: {s2['name']}")
assert s2["name"] == "Renamed"

print("\n=== 6. Get Graph (empty default) ===")
g = api("GET", f"/sandboxes/{sid}/graph")
print(f"  nodes={len(g['nodes'])}, edges={len(g['edges'])}, collector={g['collector']['id']}")

print("\n=== 7. Patch Graph (add 2 agents + 1 edge) ===")
graph = {
    "nodes": [
        {"id": "a1", "name": "Researcher", "role": "Research stuff", "output_key": "text", "output_type": "text"},
        {"id": "a2", "name": "Writer", "role": "Write report", "output_key": "text", "output_type": "text"},
    ],
    "edges": [{"source": "a1", "target": "a2"}],
    "collector": {"id": "collector", "name": "Collector", "kind": "collector"},
    "global_context": {},
}
g2 = api("PATCH", f"/sandboxes/{sid}/graph", graph)
print(f"  nodes={len(g2['nodes'])}, edges={len(g2['edges'])}")
assert len(g2["nodes"]) == 2 and len(g2["edges"]) == 1

print("\n=== 8. List Nodes (projection) ===")
nodes = api("GET", f"/sandboxes/{sid}/nodes")
print(f"  {nodes}")
assert len(nodes) >= 3  # a1, a2, collector

print("\n=== 9. List Edges (projection) ===")
edges = api("GET", f"/sandboxes/{sid}/edges")
print(f"  {edges}")
assert len(edges) == 1

print("\n=== 10. Start Run ===")
run = api("POST", "/runs", {"sandbox_id": sid, "prompt": "Tell me about atoms", "graph": graph})
rid = run["run_id"]
print(f"  run_id={rid}")

print("\n=== 11. Poll Run until done ===")
snap = None
for _ in range(200):
    snap = api("GET", f"/runs/{rid}")
    if snap["status"] in ("done", "failed"):
        break
    time.sleep(0.05)
print(f"  status={snap['status']}")
print(f"  output keys={list(snap['outputs'].keys())}")
print(f"  collector_output present={snap['collector_output'] is not None}")
assert snap["status"] == "done"
assert "a1" in snap["outputs"] and "a2" in snap["outputs"]

print("\n=== 12. List Sandbox Runs ===")
runs = api("GET", f"/sandboxes/{sid}/runs")
print(f"  count={len(runs)}, first status={runs[0]['status']}")
assert len(runs) >= 1

print("\n=== 13. Delete Sandbox ===")
api("DELETE", f"/sandboxes/{sid}")
sbs2 = api("GET", "/sandboxes")
assert not any(s["id"] == sid for s in sbs2)
print("  Deleted + confirmed gone")

print("\n=============================")
print("ALL TESTS PASSED")
