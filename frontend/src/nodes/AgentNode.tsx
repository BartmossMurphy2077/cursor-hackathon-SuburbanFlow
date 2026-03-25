import { useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
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

  const previewRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [live]);

  const isRunning = status === "running";
  const isDone = status === "done";
  const isError = status === "error";

  let borderColor = isDark ? "rgba(45,212,191,0.25)" : "rgba(0,0,0,0.12)";
  let boxShadow = "";
  if (selected) {
    borderColor = "";
  } else if (isRunning) {
    borderColor = "#f59e0b";
    boxShadow = "0 0 20px rgba(245,158,11,0.35), 0 0 40px rgba(245,158,11,0.15)";
  } else if (isDone) {
    borderColor = "#10b981";
    boxShadow = "0 0 12px rgba(16,185,129,0.2)";
  } else if (isError) {
    borderColor = "#ef4444";
    boxShadow = "0 0 16px rgba(239,68,68,0.25)";
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border-2 px-3.5 py-2.5 transition-all duration-300 ${
        selected ? "border-canvas-accent/50 shadow-node-selected" : ""
      } ${isRunning ? "animate-pulse" : ""}`}
      style={{
        borderColor: selected ? undefined : borderColor,
        boxShadow,
        backgroundColor: isDark ? "#0f1219" : "#ffffff",
        backgroundImage: isDark
          ? "linear-gradient(to bottom, #141a24, #0b0e14)"
          : "linear-gradient(to bottom, #ffffff, #f1f5f9)",
      }}
    >
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
      <div className="flex items-center gap-2 pb-2.5" style={{ borderBottom: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)" }}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[status] ?? statusStyles.idle}`} title={status} />
        <span className="truncate text-[13px] font-semibold tracking-tight" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>{data.name}</span>
        {isRunning && (
          <span className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-300" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
            Running
          </span>
        )}
        {isDone && (
          <span className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
            Done
          </span>
        )}
        {isError && (
          <span className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-300" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
            Error
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 shrink-0 text-[11px] leading-snug" style={{ color: isDark ? "#cbd5e1" : "#64748b" }}>{data.role || "—"}</p>

      <pre
        ref={previewRef}
        className="nowheel nodrag mt-2 flex-1 min-h-0 overflow-auto whitespace-pre-wrap break-all rounded-lg border p-2 font-mono text-[10px] leading-relaxed"
        style={{
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
          background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)",
          color: isDark ? "#94a3b8" : "#475569",
        }}
      >
        {live ? stripModelArtifacts(live, data.provider) : <span style={{ color: isDark ? "#475569" : "#94a3b8", fontStyle: "italic" }}>Waiting for output…</span>}
      </pre>

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
