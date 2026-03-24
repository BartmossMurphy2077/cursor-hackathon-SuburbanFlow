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
  getAgentNodeIds,
  getApiEdges,
  type AgentData,
  type CollectorData,
  wouldCreateCycle,
} from "../lib/graph";

const defaultAgentData = (): AgentData => ({
  name: "Agent",
  role: "",
  output_key: "text",
  output_type: "text",
});

function buildInitialNodes(): Node[] {
  return [
    {
      id: "agent_1",
      type: "agent",
      position: { x: 40, y: 100 },
      data: {
        name: "Researcher",
        role: "Research the topic and produce a concise summary.",
        output_key: "summary",
        output_type: "text",
      } satisfies AgentData,
    },
    {
      id: "agent_2",
      type: "agent",
      position: { x: 380, y: 100 },
      data: {
        name: "Writer",
        role: "Write a short report using the research summary.",
        output_key: "report",
        output_type: "text",
      } satisfies AgentData,
    },
    {
      id: COLLECTOR_ID,
      type: "collector",
      position: { x: 720, y: 120 },
      data: { name: "Collector" } satisfies CollectorData,
    },
  ];
}

function buildInitialEdges(): Edge[] {
  return [
    { id: "e_agent_1_agent_2", source: "agent_1", target: "agent_2", animated: false },
    { id: "e_agent_2_collector", source: "agent_2", target: COLLECTOR_ID, animated: false },
  ];
}

type CanvasState = {
  nodes: Node[];
  edges: Edge[];
  selectedId: string | null;
  sandboxName: string;
  prompt: string;
  globalContextJson: string;
  toast: string | null;
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
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: buildInitialNodes(),
  edges: buildInitialEdges(),
  selectedId: null,
  sandboxName: "My sandbox",
  prompt: "Help me draft a short atomic-structures report.",
  globalContextJson: "{}",
  toast: null,

  onNodesChange: (changes) => {
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
      const apiEdges = getApiEdges(edges, agentIds);
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
      nodes: [...get().nodes, { id, type: "agent", position, data }],
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
          data: { name: "Collector" } satisfies CollectorData,
        },
      ],
      selectedId: COLLECTOR_ID,
    });
  },

  showToast: (msg) => set({ toast: msg }),
  clearToast: () => set({ toast: null }),

  loadDemo: () =>
    set({
      nodes: buildInitialNodes(),
      edges: buildInitialEdges(),
      selectedId: null,
    }),

  setSandboxName: (name) => set({ sandboxName: name }),
  setPrompt: (prompt) => set({ prompt }),
  setGlobalContextJson: (json) => set({ globalContextJson: json }),
}));
