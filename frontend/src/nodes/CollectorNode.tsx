import { useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";

import type { CollectorData } from "../lib/graph";
import { useRunStore } from "../stores/runStore";
import { useThemeStore } from "../stores/themeStore";

export type CollectorRFNode = Node<CollectorData, "collector">;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractPreview(output: unknown, maxLen = 160): string {
  if (!output) return "";
  if (typeof output === "string") return output.slice(0, maxLen);

  const strings: string[] = [];
  function walk(val: unknown) {
    if (typeof val === "string") { strings.push(val); return; }
    if (isRecord(val)) {
      for (const [k, v] of Object.entries(val)) {
        if (k === "graph") continue;
        walk(v);
      }
    }
  }
  walk(output);
  const joined = strings.join(" ").replace(/\s+/g, " ").trim();
  return joined.slice(0, maxLen) + (joined.length > maxLen ? "..." : "");
}

export function CollectorNode({ data, selected }: NodeProps<CollectorRFNode>) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const collectorOutput = useRunStore((s) => s.collectorOutput);
  const done = collectorOutput !== null;
  const running = useRunStore((s) => s.isRunning);

  const preview = useMemo(() => extractPreview(collectorOutput), [collectorOutput]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-3.5 py-3 shadow-node transition-all ${
        selected ? "border-canvas-accent/45 shadow-node-selected" : "hover:border-[var(--ac-accent)]"
      }`}
      style={{
        borderColor: selected ? undefined : isDark ? "rgba(45,212,191,0.25)" : "rgba(0,0,0,0.12)",
        backgroundColor: isDark ? "#0f1219" : "#ffffff",
        backgroundImage: isDark
          ? "linear-gradient(135deg, rgba(45,212,191,0.08), #141a24, #0b0e14)"
          : "linear-gradient(135deg, rgba(13,148,136,0.08), #ffffff, #f1f5f9)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-canvas-accent/60 to-transparent"
        aria-hidden
      />
      <Handle
        type="target"
        position={Position.Left}
        className="ac-handle ac-handle-target"
      >
        <span className="ac-handle-label ac-handle-label-left">in</span>
      </Handle>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-canvas-accent/15 font-mono text-sm text-canvas-accent ring-1 ring-canvas-accent/25">
          ◇
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-canvas-accent">Collector</div>
          <div className="truncate text-sm font-semibold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>{data.name}</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: isDark ? "#cbd5e1" : "#64748b" }}>
        Merges upstream outputs into the final assembled result for this run.
      </p>

      {preview && (
        <pre
          className="mt-2 line-clamp-3 overflow-hidden rounded-lg border p-2 font-mono text-[9px] leading-relaxed"
          style={{
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)",
            color: isDark ? "#94a3b8" : "#475569",
          }}
        >
          {preview}
        </pre>
      )}

      <div className="mt-3 flex items-center gap-2">
        {running ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/25">
            Running
          </span>
        ) : done ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/25">
            Ready
          </span>
        ) : (
          <span className="text-[10px]" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>Idle</span>
        )}
      </div>
    </div>
  );
}
