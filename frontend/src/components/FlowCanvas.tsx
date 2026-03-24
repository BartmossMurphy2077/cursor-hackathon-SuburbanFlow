import {
  Background,
  BackgroundVariant,
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

  const rfRef = useRef<ReactFlowInstance | null>(null);

  const defaultEdgeOptions = useMemo(() => ({ style: { stroke: "#64748b", strokeWidth: 1.5 } }), []);

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
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls showInteractive={false} />
        <MiniMap
          className="!bg-canvas-panel !border !border-canvas-border"
          nodeStrokeWidth={3}
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
