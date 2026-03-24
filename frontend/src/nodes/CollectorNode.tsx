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
      className={`min-w-[200px] rounded-xl border bg-gradient-to-br from-indigo-950/80 to-canvas-panel px-3 py-2 shadow-lg ${
        selected ? "border-indigo-400 ring-2 ring-indigo-400/30" : "border-indigo-900/80"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !bg-indigo-400" />
      <div className="flex items-center gap-2">
        <span className="text-lg">◇</span>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-indigo-300">Collector</div>
          <div className="text-sm font-medium text-slate-100">{data.name}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">Merges upstream agent outputs into the final run result.</p>
      <div className="mt-2 flex items-center gap-2">
        {running ? (
          <span className="text-[10px] font-medium uppercase text-amber-400">Running…</span>
        ) : done ? (
          <span className="text-[10px] font-medium uppercase text-emerald-400">Result ready</span>
        ) : (
          <span className="text-[10px] text-canvas-muted">Idle</span>
        )}
      </div>
    </div>
  );
}
