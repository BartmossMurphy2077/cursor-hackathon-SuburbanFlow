import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";

import type { CollectorData } from "../lib/graph";
import { useRunStore } from "../stores/runStore";

export type CollectorRFNode = Node<CollectorData, "collector">;

export function CollectorNode({ data, selected }: NodeProps<CollectorRFNode>) {
  const done = useRunStore((s) => s.collectorOutput !== null);
  const running = useRunStore((s) => s.isRunning);

  return (
    <div
      className={`relative min-w-[208px] overflow-hidden rounded-2xl border px-3.5 py-3 shadow-node transition-all ${
        selected ? "border-canvas-accent/45 shadow-node-selected" : "hover:border-[var(--ac-accent)]"
      }`}
      style={{ borderColor: selected ? undefined : "var(--ac-border)", backgroundColor: "var(--ac-node-bg)", backgroundImage: "linear-gradient(135deg, rgba(45,212,191,0.08), var(--ac-node-bg-from), var(--ac-node-bg-to))" }}
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
          <div className="truncate text-sm font-semibold" style={{ color: "var(--ac-ink)" }}>{data.name}</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--ac-muted)" }}>
        Merges upstream outputs into the final assembled result for this run.
      </p>
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
          <span className="text-[10px] text-slate-500">Idle</span>
        )}
      </div>
    </div>
  );
}
