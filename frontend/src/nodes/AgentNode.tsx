import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";

import type { AgentData } from "../lib/graph";
import { useRunStore } from "../stores/runStore";

export type AgentRFNode = Node<AgentData, "agent">;

const statusStyles: Record<string, string> = {
  idle: "bg-slate-600",
  running: "bg-amber-500 animate-pulse",
  done: "bg-emerald-500",
  error: "bg-red-500",
};

export function AgentNode({ id, data, selected }: NodeProps<AgentRFNode>) {
  const status = useRunStore((s) => s.nodeStatus[id] ?? "idle");
  const live = useRunStore((s) => s.streamText[id] ?? "");

  return (
    <div
      className={`min-w-[220px] rounded-xl border bg-canvas-panel px-3 py-2 shadow-lg transition-colors ${
        selected ? "border-canvas-accent ring-2 ring-canvas-accent/40" : "border-canvas-border"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !bg-slate-700" />
      <div className="flex items-center gap-2 border-b border-canvas-border pb-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[status] ?? statusStyles.idle}`} title={status} />
        <span className="truncate text-sm font-semibold text-slate-100">{data.name}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-400">{data.role || "No role yet."}</p>
      {live ? (
        <pre className="mt-2 max-h-16 overflow-hidden text-ellipsis rounded bg-black/30 p-1.5 font-mono text-[10px] text-slate-300">
          {live.slice(-280)}
        </pre>
      ) : null}
      <div className="mt-1 flex gap-2 text-[10px] text-canvas-muted">
        <span className="rounded bg-slate-800 px-1 py-0.5 font-mono">{data.output_key}</span>
        <span className="rounded bg-slate-800 px-1 py-0.5 font-mono">{data.output_type}</span>
      </div>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !bg-slate-700" />
    </div>
  );
}
