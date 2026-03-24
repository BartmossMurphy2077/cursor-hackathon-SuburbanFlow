import type { AgentData } from "../lib/graph";

const TEMPLATES: Array<{ label: string; data: Partial<AgentData> }> = [
  {
    label: "Researcher",
    data: {
      name: "Researcher",
      role: "Research the topic deeply. Return clear facts and citations.",
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7,
      output_key: "summary",
      output_type: "text",
    },
  },
  {
    label: "Writer",
    data: {
      name: "Writer",
      role: "Turn upstream research into polished prose or a report.",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      output_key: "report",
      output_type: "text",
    },
  },
  {
    label: "Critic",
    data: {
      name: "Critic",
      role: "Review upstream content for gaps, risks, and improvements.",
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.3,
      output_key: "critique",
      output_type: "text",
    },
  },
];

export function Palette() {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-canvas-border bg-canvas-panel/95">
      <div className="border-b border-canvas-border px-3 py-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Nodes</h2>
        <p className="mt-0.5 text-[11px] text-canvas-muted">Drag onto the canvas</p>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/reactflow", JSON.stringify({ kind: "agent", template: t.data }));
              e.dataTransfer.effectAllowed = "move";
            }}
            className="rounded-lg border border-canvas-border bg-canvas-bg px-3 py-2 text-left text-sm text-slate-200 transition hover:border-canvas-accent/50 hover:bg-slate-800/80 active:cursor-grabbing"
          >
            <div className="font-medium">{t.label}</div>
            <div className="mt-0.5 line-clamp-2 text-[11px] text-canvas-muted">{t.data.role}</div>
          </button>
        ))}
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/reactflow", JSON.stringify({ kind: "agent" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          className="rounded-lg border border-dashed border-canvas-border px-3 py-2 text-left text-sm text-slate-300 hover:border-slate-500"
        >
          Blank agent
        </button>
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/reactflow", JSON.stringify({ kind: "collector" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          className="mt-2 rounded-lg border border-indigo-900/80 bg-indigo-950/50 px-3 py-2 text-left text-sm font-medium text-indigo-200 hover:bg-indigo-950"
        >
          Collector
        </button>
      </div>
    </aside>
  );
}
