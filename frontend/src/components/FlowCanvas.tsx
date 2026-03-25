import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useCallback, useMemo, useRef, type DragEvent } from "react";

import "@xyflow/react/dist/style.css";

import type { AgentData } from "../lib/graph";
import { AgentNode } from "../nodes/AgentNode";
import { CollectorNode } from "../nodes/CollectorNode";
import { useCanvasStore } from "../stores/canvasStore";
import { useThemeStore } from "../stores/themeStore";

const nodeTypes = {
  agent: AgentNode,
  collector: CollectorNode,
};

type PalettePayload = { kind: "agent"; template?: Partial<AgentData> } | { kind: "collector" };

function FlowCanvasInner() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const setSelectedId = useCanvasStore((s) => s.setSelectedId);
  const addAgentNode = useCanvasStore((s) => s.addAgentNode);
  const addOrFocusCollector = useCanvasStore((s) => s.addOrFocusCollector);
  const showToast = useCanvasStore((s) => s.showToast);

  const theme = useThemeStore((s) => s.theme);
  const rfRef = useRef<ReactFlowInstance | null>(null);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "smoothstep" as const,
      style: { stroke: "#64748b", strokeWidth: 2 },
      animated: true,
    }),
    [],
  );
  const connectionLineStyle = useMemo(
    () => ({ stroke: "#2dd4bf", strokeWidth: 2.5, strokeDasharray: "6 3" }),
    [],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const rf = rfRef.current;
      if (!rf) return;
      const raw = e.dataTransfer.getData("application/reactflow");
      if (!raw) return;
      let payload: PalettePayload;
      try {
        payload = JSON.parse(raw) as PalettePayload;
      } catch {
        showToast("Invalid drop payload.");
        return;
      }
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      if (payload.kind === "collector") {
        addOrFocusCollector(pos);
      } else {
        addAgentNode(pos, payload.template);
      }
    },
    [addAgentNode, addOrFocusCollector, showToast],
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        className={theme === "dark" ? "dark" : ""}
        nodes={nodes}
        edges={edges}
        onInit={(inst) => {
          rfRef.current = inst;
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelectedId(node.id)}
        onPaneClick={() => setSelectedId(null)}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        connectionLineStyle={connectionLineStyle}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.5}
        snapToGrid
        snapGrid={[12, 12]}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.15}
          color={theme === "dark" ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.18)"}
        />
        <Controls showInteractive={false} />
        <MiniMap
          maskColor={theme === "dark" ? "rgba(9,11,15,0.75)" : "rgba(248,250,252,0.7)"}
          nodeColor={() => theme === "dark" ? "rgba(45,212,191,0.4)" : "rgba(13,148,136,0.45)"}
          nodeStrokeWidth={2}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
