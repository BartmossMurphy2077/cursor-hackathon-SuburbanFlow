import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";

import {
  COLLECTOR_ID,
  graphToCanvas,
  getAgentNodeIds,
  getApiEdges,
  type AgentData,
  type CollectorData,
  type PipelineGraphPayload,
  wouldCreateCycle,
} from "../lib/graph";

const defaultAgentData = (): AgentData => ({
  name: "Agent",
  role: "",
  provider: "openai",
  model: "gpt-4o-mini",
  temperature: 0.7,
  output_key: "text",
  output_type: "text",
});

export type PendingDelete = { names: string; edgeCount: number; changes: NodeChange[] } | null;

type CanvasState = {
  sandboxId: string | null;
  nodes: Node[];
  edges: Edge[];
  selectedId: string | null;
  sandboxName: string;
  prompt: string;
  globalContextJson: string;
  toast: string | null;
  pendingDelete: PendingDelete;
  pendingClear: boolean;
  confirmDelete: () => void;
  cancelDelete: () => void;
  requestClear: () => void;
  confirmClear: () => void;
  cancelClear: () => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;
  setSelectedId: (id: string | null) => void;
  updateNodeData: (id: string, partial: Record<string, unknown>) => void;
  addAgentNode: (position: { x: number; y: number }, template?: Partial<AgentData>) => void;
  addOrFocusCollector: (position?: { x: number; y: number }) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
  loadDemo: () => void;
  setSandboxName: (name: string) => void;
  setPrompt: (prompt: string) => void;
  setGlobalContextJson: (json: string) => void;
  setSandboxMeta: (meta: { id: string; name: string }) => void;
  loadGraphFromApi: (graph: PipelineGraphPayload) => void;
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  sandboxId: null,
  nodes: [],
  edges: [],
  selectedId: null,
  sandboxName: "My sandbox",
  prompt: "",
  globalContextJson: "{}",
  toast: null,
  pendingDelete: null,
  pendingClear: false,

  requestClear: () => set({ pendingClear: true }),
  confirmClear: () => {
    import("./runStore").then(({ useRunStore }) => useRunStore.getState().resetForNewRun());
    set({
      pendingClear: false,
      sandboxId: null,
      nodes: [],
      edges: [],
      selectedId: null,
      prompt: "",
    });
  },
  cancelClear: () => set({ pendingClear: false }),

  confirmDelete: () => {
    const pd = get().pendingDelete;
    if (!pd) return;
    set({
      nodes: applyNodeChanges(pd.changes, get().nodes),
      pendingDelete: null,
    });
  },

  cancelDelete: () => set({ pendingDelete: null }),

  onNodesChange: (changes) => {
    const removes = changes.filter((c) => c.type === "remove");
    if (removes.length > 0) {
      const { nodes, edges } = get();
      const removeIds = new Set(removes.map((c) => c.id));
      const affectedEdges = edges.filter((e) => removeIds.has(e.source) || removeIds.has(e.target));
      const names = removes.map((c) => {
        const n = nodes.find((nd) => nd.id === c.id);
        return (n?.data as Record<string, unknown> | undefined)?.name as string ?? c.id;
      }).join(", ");
      set({
        pendingDelete: { names, edgeCount: affectedEdges.length, changes },
      });
      return;
    }
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (conn) => {
    if (!conn.source || !conn.target) return;
    const { nodes, edges } = get();
    const sourceN = nodes.find((n) => n.id === conn.source);
    const targetN = nodes.find((n) => n.id === conn.target);
    if (!sourceN || !targetN) return;
    if (sourceN.type === "collector") {
      get().showToast("Collector cannot be a source.");
      return;
    }
    if (sourceN.type === "agent" && targetN.type === "agent") {
      const agentIds = getAgentNodeIds(nodes);
      const apiEdges = getApiEdges(edges, agentIds, COLLECTOR_ID);
      if (wouldCreateCycle(apiEdges, { source: conn.source, target: conn.target }, agentIds)) {
        get().showToast("That connection would create a cycle.");
        return;
      }
    }
    set({ edges: addEdge({ ...conn, animated: true }, get().edges) });
  },

  setSelectedId: (id) => set({ selectedId: id }),

  updateNodeData: (id, partial) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== id) return n;
        return { ...n, data: { ...n.data, ...partial } };
      }),
    });
  },

  addAgentNode: (position, template) => {
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `agent_${Date.now()}`;
    const base = defaultAgentData();
    const data: AgentData = { ...base, ...template };
    set({
      nodes: [...get().nodes, { id, type: "agent", position, style: { width: 260, height: 240 }, data }],
      selectedId: id,
    });
  },

  addOrFocusCollector: (position) => {
    const existing = get().nodes.find((n) => n.type === "collector");
    if (existing) {
      set({ selectedId: existing.id });
      get().showToast("Collector already on canvas — selected.");
      return;
    }
    const pos = position ?? { x: 640, y: 140 };
    set({
      nodes: [
        ...get().nodes,
        {
          id: COLLECTOR_ID,
          type: "collector",
          position: pos,
          style: { width: 260, height: 200 },
          data: {
            name: "Collector",
            role: "Summarize the directly connected agent outputs into a clear final report.",
            provider: "anthropic",
            model: "claude-sonnet-4-20250514",
            temperature: 0.4,
            output_key: "final_report",
            output_type: "text",
          } satisfies CollectorData,
        },
      ],
      selectedId: COLLECTOR_ID,
    });
  },

  showToast: (msg) => set({ toast: msg }),
  clearToast: () => set({ toast: null }),

  loadDemo: () => {
    if (get().nodes.length === 0 && get().edges.length === 0) return;
    set({ pendingClear: true });
  },

  setSandboxName: (name) => set({ sandboxName: name }),
  setPrompt: (prompt) => set({ prompt }),
  setGlobalContextJson: (json) => set({ globalContextJson: json }),
  setSandboxMeta: ({ id, name }) => set({ sandboxId: id, sandboxName: name }),
  loadGraphFromApi: (graph) => {
    const canvas = graphToCanvas(graph);
    set({
      nodes: canvas.nodes,
      edges: canvas.edges,
      selectedId: null,
      globalContextJson: JSON.stringify(graph.global_context ?? {}, null, 2),
    });
  },
}));
