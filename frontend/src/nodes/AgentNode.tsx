import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";

import type { AgentData } from "../lib/graph";
import { useRunStore } from "../stores/runStore";

export type AgentRFNode = Node<AgentData, "agent">;

const statusStyles: Record<string, string> = {
  idle: "bg-slate-500",
  running: "animate-pulse bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.45)]",
  done: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.35)]",
  error: "bg-red-500 shadow-[0_0_10px_rgba(251,113,133,0.35)]",
};

export function AgentNode({ id, data, selected }: NodeProps<AgentRFNode>) {
  const status = useRunStore((s) => s.nodeStatus[id] ?? "idle");
  const live = useRunStore((s) => s.streamText[id] ?? "");
  const preview = live ? live.slice(-360) : "";

  return (
    <div
      className={`relative w-[300px] max-w-[300px] overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.06] to-black/25 px-3.5 py-2.5 shadow-node backdrop-blur-sm transition-all ${
        selected ? "border-canvas-accent/50 shadow-node-selected" : "border-canvas-border hover:border-white/15"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-canvas-accent/40 to-transparent"
        aria-hidden
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-canvas-border !bg-canvas-elevated !shadow-inner"
      />
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-2.5">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[status] ?? statusStyles.idle}`} title={status} />
        <span className="truncate text-[13px] font-semibold tracking-tight text-white">{data.name}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-slate-500">{data.role || "—"}</p>
      {live ? (
        <pre className="mt-2 h-20 max-h-20 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all rounded-lg border border-white/[0.06] bg-black/30 p-2 font-mono text-[10px] leading-relaxed text-slate-400">
          {preview}
        </pre>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
        <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono normal-case text-canvas-accent">
          {data.provider === "anthropic" ? "claude" : "chatgpt"}
        </span>
        <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono normal-case text-slate-400">{data.model}</span>
        <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono normal-case">{data.output_key}</span>
        <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono normal-case">{data.output_type}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-canvas-border !bg-canvas-elevated !shadow-inner"
      />
    </div>
  );
}
