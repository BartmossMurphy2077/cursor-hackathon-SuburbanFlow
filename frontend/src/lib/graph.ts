import type { Edge, Node } from "@xyflow/react";

export const COLLECTOR_ID = "collector";

export type AgentData = {
  name: string;
  role: string;
  output_key: string;
  output_type: "text" | "json";
};

export type CollectorData = {
  name: string;
};

export type RunRequestPayload = {
  sandbox_id: string;
  prompt: string;
  graph: {
    nodes: Array<{
      id: string;
      name: string;
      role: string;
      output_key: string;
      output_type: "text" | "json";
    }>;
    edges: Array<{ source: string; target: string }>;
    collector: { id: string; name: string; kind: "collector" };
    global_context: Record<string, unknown>;
  };
};

export function getAgentNodeIds(nodes: Node[]): Set<string> {
  const ids = new Set<string>();
  for (const n of nodes) {
    if (n.type === "agent") ids.add(n.id);
  }
  return ids;
}

/**
 * Agent→agent edges only (API contract). Drops edges to/from collector.
 */
export function getApiEdges(edges: Edge[], agentIds: Set<string>): Array<{ source: string; target: string }> {
  const out: Array<{ source: string; target: string }> = [];
  for (const e of edges) {
    if (agentIds.has(e.source) && agentIds.has(e.target)) {
      out.push({ source: e.source, target: e.target });
    }
  }
  return out;
}

function hasCycleInAgentGraph(
  agentIds: Set<string>,
  edges: Array<{ source: string; target: string }>,
): boolean {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of agentIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    if (!agentIds.has(e.source) || !agentIds.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }
  const queue = [...agentIds].filter((id) => (inDegree.get(id) ?? 0) === 0);
  let seen = 0;
  while (queue.length > 0) {
    const v = queue.shift()!;
    seen++;
    for (const w of adj.get(v) ?? []) {
      const d = (inDegree.get(w) ?? 0) - 1;
      inDegree.set(w, d);
      if (d === 0) queue.push(w);
    }
  }
  return seen !== agentIds.size;
}

/** True if adding this agent→agent edge would create a cycle. */
export function wouldCreateCycle(
  apiEdges: Array<{ source: string; target: string }>,
  newEdge: { source: string; target: string },
  agentIds: Set<string>,
): boolean {
  if (newEdge.source === newEdge.target) return true;
  const next = [...apiEdgesFilterDedupe(apiEdges, newEdge), newEdge];
  return hasCycleInAgentGraph(agentIds, next);
}

function apiEdgesFilterDedupe(
  edges: Array<{ source: string; target: string }>,
  newEdge: { source: string; target: string },
): Array<{ source: string; target: string }> {
  return edges.filter((e) => !(e.source === newEdge.source && e.target === newEdge.target));
}

export function validateGraphForRun(
  nodes: Node[],
  edges: Edge[],
  globalContext: Record<string, unknown> = {},
): { ok: true; payload: RunRequestPayload } | { ok: false; error: string } {
  const agentNodes = nodes.filter((n): n is Node & { type: "agent"; data: AgentData } => n.type === "agent");
  const collector = nodes.find((n) => n.type === "collector") as (Node & { data: CollectorData }) | undefined;

  if (agentNodes.length === 0) {
    return { ok: false, error: "Add at least one agent node." };
  }
  if (!collector) {
    return { ok: false, error: "Add a Collector node." };
  }

  const agentIds = getAgentNodeIds(nodes);
  const apiEdges = getApiEdges(edges, agentIds);

  if (hasCycleInAgentGraph(agentIds, apiEdges)) {
    return { ok: false, error: "Graph has a cycle. Remove edges until the agent graph is a DAG." };
  }

  const payload: RunRequestPayload = {
    sandbox_id: "canvas_sandbox",
    prompt: "", // filled by caller
    graph: {
      nodes: agentNodes.map((n) => ({
        id: n.id,
        name: String(n.data.name ?? "Agent"),
        role: String(n.data.role ?? ""),
        output_key: String(n.data.output_key ?? "text"),
        output_type: n.data.output_type === "json" ? "json" : "text",
      })),
      edges: apiEdges,
      collector: {
        id: collector.id,
        name: String(collector.data.name ?? "Collector"),
        kind: "collector",
      },
      global_context: globalContext,
    },
  };

  return { ok: true, payload };
}

export function withPrompt(payload: RunRequestPayload, prompt: string): RunRequestPayload {
  return { ...payload, prompt };
}
