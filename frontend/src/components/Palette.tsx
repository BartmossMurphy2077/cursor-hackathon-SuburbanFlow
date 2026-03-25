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
    <aside className="flex h-full w-full flex-col backdrop-blur-xl" style={{ borderRight: "1px solid var(--ac-border)", background: "var(--ac-elevated)" }}>
      <div className="ac-panel-header">
        <h2 className="ac-panel-title">Library</h2>
        <p className="ac-panel-sub">Drag a block onto the canvas</p>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/reactflow", JSON.stringify({ kind: "agent", template: t.data }));
              e.dataTransfer.effectAllowed = "move";
            }}
            className="group rounded-xl border px-3 py-2.5 text-left shadow-panel transition hover:border-canvas-accent/35 hover:shadow-node active:cursor-grabbing"
            style={{ borderColor: "var(--ac-border)", backgroundColor: "var(--ac-node-bg)", backgroundImage: "linear-gradient(to bottom, var(--ac-node-bg-from), var(--ac-node-bg-to))" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold" style={{ color: "var(--ac-ink)" }}>{t.label}</span>
              <span className="rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide opacity-0 transition group-hover:opacity-100" style={{ background: "var(--ac-code-bg)", color: "var(--ac-muted)" }}>
                Agent
              </span>
            </div>
            <div className="mt-1 line-clamp-2 text-[11px] leading-snug" style={{ color: "var(--ac-muted)" }}>{t.data.role}</div>
          </button>
        ))}
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/reactflow", JSON.stringify({ kind: "agent" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          className="rounded-xl border border-dashed px-3 py-2.5 text-left text-sm transition hover:border-canvas-accent/40"
          style={{ borderColor: "var(--ac-border)", color: "var(--ac-muted)", backgroundColor: "var(--ac-node-bg)" }}
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
          className="mt-1 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold shadow-panel transition hover:border-canvas-accent/45"
          style={{ borderColor: "rgba(45,212,191,0.25)", backgroundColor: "var(--ac-node-bg)", backgroundImage: "linear-gradient(135deg, rgba(45,212,191,0.1), var(--ac-node-bg-from), var(--ac-node-bg-to))", color: "var(--ac-accent)" }}
        >
          Collector
        </button>
      </div>
    </aside>
  );
}
