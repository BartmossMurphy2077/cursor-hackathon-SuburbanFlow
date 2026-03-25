import { useState, useEffect, useRef } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
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
  const output = useRunStore((s) => s.nodeOutputs[id]);

  const previewRef = useRef<HTMLPreElement>(null);
  const expandedRef = useRef<HTMLPreElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [live]);

  useEffect(() => {
    if (expandedRef.current) {
      expandedRef.current.scrollTop = expandedRef.current.scrollHeight;
    }
  }, [live, expanded]);

  const hasContent = !!(live || output);
  const displayText = output ? JSON.stringify(output, null, 2) : live;

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.06] to-black/25 px-3.5 py-2.5 shadow-node backdrop-blur-sm transition-shadow ${
        selected ? "border-canvas-accent/50 shadow-node-selected" : "border-canvas-border hover:border-white/15"
      }`}
    >
      <NodeResizer
        minWidth={228}
        minHeight={200}
        isVisible={selected}
        lineClassName="!border-canvas-accent/30"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border !border-canvas-accent/50 !bg-canvas-elevated"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-canvas-accent/40 to-transparent"
        aria-hidden
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-canvas-border !bg-canvas-elevated !shadow-inner"
      />

      {/* Header — fixed */}
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-2.5">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[status] ?? statusStyles.idle}`} title={status} />
        <span className="truncate text-[13px] font-semibold tracking-tight text-white">{data.name}</span>
      </div>
      <p className="mt-2 line-clamp-2 shrink-0 text-[11px] leading-snug text-slate-500">{data.role || "—"}</p>

      {/* Streaming preview — grows with the node */}
      <pre
        ref={previewRef}
        className="nowheel nodrag mt-2 min-h-[4rem] flex-1 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/30 p-2 font-mono text-[10px] leading-relaxed text-slate-400"
      >
        {live || <span className="italic text-slate-600">Waiting for output…</span>}
      </pre>

      {/* Toggle bar for full output dropdown */}
      <button
        type="button"
        onClick={() => hasContent && setExpanded((v) => !v)}
        className={`nodrag nowheel mt-2 flex w-full shrink-0 items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] font-medium transition-colors ${
          hasContent
            ? "cursor-pointer text-slate-400 hover:bg-white/[0.06] hover:text-slate-300"
            : "cursor-default text-slate-600"
        }`}
      >
        <span>Full Output</span>
        <svg
          className={`h-3 w-3 transition-transform duration-200 ${expanded && hasContent ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        className={`shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
          expanded && hasContent ? "mt-1 max-h-48" : "max-h-0"
        }`}
      >
        <pre
          ref={expandedRef}
          className="nowheel nodrag h-48 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/30 p-2 font-mono text-[10px] leading-relaxed text-slate-400"
        >
          {displayText || "No output yet."}
        </pre>
      </div>

      {/* Badges — fixed at bottom */}
      <div className="mt-2 flex shrink-0 flex-wrap gap-1.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
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
