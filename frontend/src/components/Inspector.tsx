import { useMemo } from "react";

import { validateGraphForRun, withPrompt } from "../lib/graph";
import { useCanvasStore } from "../stores/canvasStore";
import { useRunStore } from "../stores/runStore";

const MODEL_OPTIONS = {
  openai: [
    { value: "gpt-4o-mini", label: "gpt-4o-mini" },
    { value: "gpt-4o", label: "gpt-4o" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "claude-sonnet-4" },
    { value: "claude-3-5-sonnet-latest", label: "claude-3.5-sonnet" },
  ],
} as const;

function parseGlobalContext(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json || "{}") as unknown;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return {};
}

export function Inspector() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const globalContextJson = useCanvasStore((s) => s.globalContextJson);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const prompt = useCanvasStore((s) => s.prompt);
  const collectorOutput = useRunStore((s) => s.collectorOutput);
  const nodeOutputs = useRunStore((s) => s.nodeOutputs);
  const streamText = useRunStore((s) => s.streamText);

  const selected = nodes.find((n) => n.id === selectedId);

  const globalContext = useMemo(() => parseGlobalContext(globalContextJson), [globalContextJson]);

  const validation = useMemo(() => {
    if (nodes.length === 0) return { ok: false as const, error: "Empty graph" };
    return validateGraphForRun(nodes, edges, globalContext);
  }, [nodes, edges, globalContext]);

  let payloadPreview = "";
  if (validation.ok) {
    try {
      payloadPreview = JSON.stringify(withPrompt(validation.payload, prompt), null, 2);
    } catch {
      payloadPreview = "(could not serialize)";
    }
  }

  if (!selected) {
    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-canvas-border bg-canvas-panel/95">
        <div className="border-b border-canvas-border px-3 py-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Inspector</h2>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-3 text-sm text-canvas-muted">
          <p>Select a node to edit its configuration.</p>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Run payload preview</div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 p-2 font-mono text-[10px] text-slate-400">
              {validation.ok ? payloadPreview : validation.error}
            </pre>
          </div>
        </div>
      </aside>
    );
  }

  if (selected.type === "agent") {
    const d = selected.data as {
      name: string;
      role: string;
      provider: "openai" | "anthropic";
      model: string;
      temperature: number;
      output_key: string;
      output_type: string;
    };
    const out = nodeOutputs[selected.id];
    const live = streamText[selected.id];

    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-canvas-border bg-canvas-panel/95">
        <div className="border-b border-canvas-border px-3 py-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Agent</h2>
          <p className="truncate font-mono text-[11px] text-canvas-muted">{selected.id}</p>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
          <label className="block text-xs font-medium text-slate-400">
            Name
            <input
              className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-bg px-2 py-1.5 text-sm text-slate-100"
              value={d.name}
              onChange={(e) => updateNodeData(selected.id, { name: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Role / prompt
            <textarea
              className="mt-1 min-h-[100px] w-full resize-y rounded-lg border border-canvas-border bg-canvas-bg px-2 py-1.5 text-sm text-slate-100"
              value={d.role}
              onChange={(e) => updateNodeData(selected.id, { role: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Model provider
            <select
              className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-bg px-2 py-1.5 text-sm text-slate-100"
              value={d.provider}
              onChange={(e) => {
                const provider = e.target.value === "anthropic" ? "anthropic" : "openai";
                const fallbackModel = MODEL_OPTIONS[provider][0]?.value ?? "";
                updateNodeData(selected.id, { provider, model: fallbackModel });
              }}
            >
              <option value="openai">ChatGPT (OpenAI)</option>
              <option value="anthropic">Claude (Anthropic)</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Model
            <select
              className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-bg px-2 py-1.5 text-sm text-slate-100"
              value={d.model}
              onChange={(e) => updateNodeData(selected.id, { model: e.target.value })}
            >
              {MODEL_OPTIONS[d.provider].map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Temperature ({typeof d.temperature === "number" ? d.temperature.toFixed(2) : "0.70"})
            <input
              className="mt-1 w-full accent-canvas-accent"
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={typeof d.temperature === "number" ? d.temperature : 0.7}
              onChange={(e) => updateNodeData(selected.id, { temperature: Number(e.target.value) })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Output key
            <input
              className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-bg px-2 py-1.5 font-mono text-sm text-slate-100"
              value={d.output_key}
              onChange={(e) => updateNodeData(selected.id, { output_key: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Output type
            <select
              className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-bg px-2 py-1.5 text-sm text-slate-100"
              value={d.output_type}
              onChange={(e) =>
                updateNodeData(selected.id, { output_type: e.target.value === "json" ? "json" : "text" })
              }
            >
              <option value="text">text</option>
              <option value="json">json</option>
            </select>
          </label>
          {(live || out) && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Last run</div>
              <pre className="max-h-40 overflow-auto rounded-lg bg-black/40 p-2 font-mono text-[10px] text-slate-300">
                {JSON.stringify(out ?? (live ? { stream: live } : {}), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </aside>
    );
  }

  /* collector */
  const cd = selected.data as { name: string };

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-canvas-border bg-canvas-panel/95">
      <div className="border-b border-canvas-border px-3 py-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Collector</h2>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        <label className="block text-xs font-medium text-slate-400">
          Name
          <input
            className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-bg px-2 py-1.5 text-sm text-slate-100"
            value={cd.name}
            onChange={(e) => updateNodeData(selected.id, { name: e.target.value })}
          />
        </label>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Final output</div>
          <pre className="max-h-64 overflow-auto rounded-lg bg-black/40 p-2 font-mono text-[10px] text-slate-300">
            {collectorOutput != null ? JSON.stringify(collectorOutput, null, 2) : "Run the pipeline to see merged output."}
          </pre>
        </div>
      </div>
    </aside>
  );
}
