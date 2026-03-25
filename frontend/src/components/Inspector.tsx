import { useMemo } from "react";

import { CollectorOutputView } from "./CollectorOutputView";
import { validateGraphForRun, withPrompt } from "../lib/graph";
import { stripModelArtifacts } from "../lib/stripArtifacts";
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
      <aside className="flex w-[22rem] shrink-0 flex-col backdrop-blur-xl" style={{ borderLeft: "1px solid var(--ac-border)", background: "var(--ac-elevated)" }}>
        <div className="ac-panel-header">
          <h2 className="ac-panel-title">Inspector</h2>
          <p className="ac-panel-sub">Select a node to edit details</p>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4 text-sm" style={{ color: "var(--ac-muted)" }}>
          <p className="leading-relaxed">Click any agent or the collector on the canvas.</p>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ac-muted)" }}>Payload preview</div>
            <pre className="max-h-52 overflow-auto rounded-xl border p-3 font-mono text-[10px] leading-relaxed shadow-inner" style={{ borderColor: "var(--ac-border)", background: "var(--ac-surface)", color: "var(--ac-muted)" }}>
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
      <aside className="flex w-[22rem] shrink-0 flex-col backdrop-blur-xl" style={{ borderLeft: "1px solid var(--ac-border)", background: "var(--ac-elevated)" }}>
        <div className="ac-panel-header">
          <h2 className="ac-panel-title">Agent</h2>
          <p className="truncate font-mono text-[10px]" style={{ color: "var(--ac-muted)" }}>{selected.id}</p>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <label className="ac-label">
            Name
            <input className="ac-input" value={d.name} onChange={(e) => updateNodeData(selected.id, { name: e.target.value })} />
          </label>
          <label className="ac-label">
            Role / prompt
            <textarea
              className="ac-input min-h-[104px] resize-y"
              value={d.role}
              onChange={(e) => updateNodeData(selected.id, { role: e.target.value })}
            />
          </label>
          <label className="ac-label">
            Model provider
            <select
              className="ac-input"
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
          <label className="ac-label">
            Model
            <select className="ac-input" value={d.model} onChange={(e) => updateNodeData(selected.id, { model: e.target.value })}>
              {MODEL_OPTIONS[d.provider].map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-label">
            Temperature ({typeof d.temperature === "number" ? d.temperature.toFixed(2) : "0.70"})
            <input
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-canvas-accent [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-canvas-accent [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(45,212,191,0.5)]"
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={typeof d.temperature === "number" ? d.temperature : 0.7}
              onChange={(e) => updateNodeData(selected.id, { temperature: Number(e.target.value) })}
            />
          </label>
          <label className="ac-label">
            Output key
            <input
              className="ac-input font-mono text-xs"
              value={d.output_key}
              onChange={(e) => updateNodeData(selected.id, { output_key: e.target.value })}
            />
          </label>
          <label className="ac-label">
            Output type
            <select
              className="ac-input"
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
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ac-muted)" }}>Last run</div>
              <pre className="max-h-44 overflow-auto rounded-xl border p-3 font-mono text-[10px] leading-relaxed shadow-inner" style={{ borderColor: "var(--ac-border)", background: "var(--ac-surface)", color: "var(--ac-muted)" }}>
                {stripModelArtifacts(
                  JSON.stringify(out ?? (live ? { stream: live } : {}), null, 2),
                  d.provider,
                )}
              </pre>
            </div>
          )}
        </div>
      </aside>
    );
  }

  const cd = selected.data as {
    name: string;
    role: string;
    provider: "openai" | "anthropic";
    model: string;
    temperature: number;
    output_key: string;
    output_type: string;
  };
  const collectorProvider = cd.provider === "anthropic" ? "anthropic" : "openai";

  return (
    <aside className="flex w-[22rem] shrink-0 flex-col backdrop-blur-xl" style={{ borderLeft: "1px solid var(--ac-border)", background: "var(--ac-elevated)" }}>
      <div className="ac-panel-header" style={{ background: "linear-gradient(to right, rgba(45,212,191,0.1), transparent)" }}>
        <h2 className="ac-panel-title" style={{ color: "var(--ac-accent)" }}>Collector</h2>
        <p className="ac-panel-sub">Final synthesis agent</p>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <label className="ac-label">
          Name
          <input className="ac-input" value={cd.name ?? "Collector"} onChange={(e) => updateNodeData(selected.id, { name: e.target.value })} />
        </label>
        <label className="ac-label">
          Collector instructions
          <textarea
            className="ac-input min-h-[96px] resize-y"
            value={cd.role ?? "Summarize the directly connected agent outputs into a clear final report."}
            onChange={(e) => updateNodeData(selected.id, { role: e.target.value })}
          />
        </label>
        <label className="ac-label">
          Model provider
          <select
            className="ac-input"
            value={collectorProvider}
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
        <label className="ac-label">
          Model
          <select
            className="ac-input"
            value={cd.model ?? MODEL_OPTIONS[collectorProvider][0]?.value ?? ""}
            onChange={(e) => updateNodeData(selected.id, { model: e.target.value })}
          >
            {MODEL_OPTIONS[collectorProvider].map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ac-label">
          Temperature ({typeof cd.temperature === "number" ? cd.temperature.toFixed(2) : "0.40"})
          <input
            className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-canvas-accent [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-canvas-accent [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(45,212,191,0.5)]"
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={typeof cd.temperature === "number" ? cd.temperature : 0.4}
            onChange={(e) => updateNodeData(selected.id, { temperature: Number(e.target.value) })}
          />
        </label>
        <label className="ac-label">
          Output key
          <input
            className="ac-input font-mono text-xs"
            value={cd.output_key ?? "final_report"}
            onChange={(e) => updateNodeData(selected.id, { output_key: e.target.value })}
          />
        </label>
        <label className="ac-label">
          Output type
          <select
            className="ac-input"
            value={cd.output_type === "json" ? "json" : "text"}
            onChange={(e) =>
              updateNodeData(selected.id, { output_type: e.target.value === "json" ? "json" : "text" })
            }
          >
            <option value="text">text</option>
            <option value="json">json</option>
          </select>
        </label>
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ac-muted)" }}>Final output</div>
          <CollectorOutputView collectorOutput={collectorOutput} />
        </div>
      </div>
    </aside>
  );
}
