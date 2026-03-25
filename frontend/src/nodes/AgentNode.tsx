import { useState, useEffect, useRef } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";

import type { AgentData } from "../lib/graph";
import { stripModelArtifacts } from "../lib/stripArtifacts";
import { useRunStore } from "../stores/runStore";
import { useThemeStore } from "../stores/themeStore";

export type AgentRFNode = Node<AgentData, "agent">;

const statusStyles: Record<string, string> = {
  idle: "bg-slate-500",
  running: "animate-pulse bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.45)]",
  done: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.35)]",
  error: "bg-red-500 shadow-[0_0_10px_rgba(251,113,133,0.35)]",
};

export function AgentNode({ id, data, selected }: NodeProps<AgentRFNode>) {
  const isDark = useThemeStore((s) => s.theme === "dark");
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
  const rawDisplay = output ? JSON.stringify(output, null, 2) : live;
  const displayText = rawDisplay ? stripModelArtifacts(rawDisplay, data.provider) : rawDisplay;

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border px-3.5 py-2.5 shadow-node transition-shadow ${
        selected ? "border-canvas-accent/50 shadow-node-selected" : "hover:border-[var(--ac-accent)]"
      }`}
      style={{
        borderColor: selected ? undefined : isDark ? "rgba(45,212,191,0.25)" : "rgba(0,0,0,0.12)",
        backgroundColor: isDark ? "#0f1219" : "#ffffff",
        backgroundImage: isDark
          ? "linear-gradient(to bottom, #141a24, #0b0e14)"
          : "linear-gradient(to bottom, #ffffff, #f1f5f9)",
      }}
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
        className="ac-handle ac-handle-target"
      >
        <span className="ac-handle-label ac-handle-label-left">in</span>
      </Handle>

      {/* Header — fixed */}
      <div className="flex items-center gap-2.5 pb-2.5" style={{ borderBottom: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)" }}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[status] ?? statusStyles.idle}`} title={status} />
        <span className="truncate text-[13px] font-semibold tracking-tight" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>{data.name}</span>
      </div>
      <p className="mt-2 line-clamp-2 shrink-0 text-[11px] leading-snug" style={{ color: isDark ? "#cbd5e1" : "#64748b" }}>{data.role || "—"}</p>

      {/* Streaming preview — grows with the node */}
      <pre
        ref={previewRef}
        className="nowheel nodrag mt-2 min-h-[4rem] flex-1 overflow-y-auto rounded-lg border p-2 font-mono text-[10px] leading-relaxed"
        style={{
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
          background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)",
          color: isDark ? "#94a3b8" : "#475569",
        }}
      >
        {live ? stripModelArtifacts(live, data.provider) : <span style={{ color: isDark ? "#475569" : "#94a3b8", fontStyle: "italic" }}>Waiting for output…</span>}
      </pre>

      {/* Toggle bar for full output dropdown */}
      <button
        type="button"
        onClick={() => hasContent && setExpanded((v) => !v)}
        className={`nodrag nowheel mt-2 flex w-full shrink-0 items-center justify-between rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
          hasContent
            ? "cursor-pointer hover:brightness-110"
            : "cursor-default opacity-50"
        }`}
        style={{
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
          background: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)",
          color: isDark ? "#94a3b8" : "#64748b",
        }}
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
          className="nowheel nodrag h-48 overflow-y-auto rounded-lg border p-2 font-mono text-[10px] leading-relaxed"
          style={{
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)",
            color: isDark ? "#94a3b8" : "#475569",
          }}
        >
          {displayText || "No output yet."}
        </pre>
      </div>

      {/* Badges — fixed at bottom */}
      <div className="mt-2 flex shrink-0 flex-wrap gap-1.5 text-[9px] font-medium uppercase tracking-wide" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
        <span className="rounded-md px-1.5 py-0.5 font-mono normal-case" style={{ background: isDark ? "rgba(45,212,191,0.12)" : "rgba(13,148,136,0.1)", color: isDark ? "#2dd4bf" : "#0d9488" }}>
          {data.provider === "anthropic" ? "claude" : "chatgpt"}
        </span>
        <span className="rounded-md px-1.5 py-0.5 font-mono normal-case" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: isDark ? "#cbd5e1" : "#475569" }}>{data.model}</span>
        <span className="rounded-md px-1.5 py-0.5 font-mono normal-case" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: isDark ? "#94a3b8" : "#64748b" }}>{data.output_key}</span>
        <span className="rounded-md px-1.5 py-0.5 font-mono normal-case" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: isDark ? "#94a3b8" : "#64748b" }}>{data.output_type}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="ac-handle ac-handle-source"
      >
        <span className="ac-handle-label ac-handle-label-right">out</span>
      </Handle>
    </div>
  );
}
