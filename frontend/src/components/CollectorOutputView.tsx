type CollectorOutputViewProps = {
  collectorOutput: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNodeOutputs(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  if (isRecord(value.final)) return value.final;
  return value;
}

function renderValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function truncate(text: string, max = 360): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export function CollectorOutputView({ collectorOutput }: CollectorOutputViewProps) {
  if (collectorOutput == null) {
    return (
      <div className="rounded-xl border border-canvas-border bg-black/20 p-4 text-sm text-slate-500 shadow-inner">
        Run the pipeline to generate the collector result.
      </div>
    );
  }

  const directOutputs = isRecord(collectorOutput) && isRecord(collectorOutput.direct_inputs)
    ? collectorOutput.direct_inputs
    : toNodeOutputs(collectorOutput);
  const referenceOutputs = isRecord(collectorOutput) && isRecord(collectorOutput.reference_outputs)
    ? collectorOutput.reference_outputs
    : {};
  const finalSummary = isRecord(collectorOutput) ? collectorOutput.summary : undefined;

  const directEntries = Object.entries(directOutputs);
  const totalFields = directEntries.reduce((acc, [, nodeOut]) => {
    if (!isRecord(nodeOut)) return acc;
    return acc + Object.keys(nodeOut).length;
  }, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-canvas-border bg-black/20 px-3 py-2 shadow-inner">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Direct inputs</div>
          <div className="mt-1 text-lg font-semibold text-white">{directEntries.length}</div>
        </div>
        <div className="rounded-lg border border-canvas-border bg-black/20 px-3 py-2 shadow-inner">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Output fields</div>
          <div className="mt-1 text-lg font-semibold text-white">{totalFields}</div>
        </div>
      </div>

      {finalSummary !== undefined ? (
        <section className="rounded-xl border border-canvas-accent/30 bg-gradient-to-r from-canvas-accent/10 to-transparent p-3 shadow-inner">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-canvas-accent">
            Collector final summary
          </div>
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-200">
            {renderValue(finalSummary)}
          </pre>
        </section>
      ) : null}

      {directEntries.length > 0 ? (
        <div className="space-y-2">
          {directEntries.map(([nodeId, nodeOut]) => {
            const fields = isRecord(nodeOut) ? Object.entries(nodeOut) : [["output", nodeOut]];
            return (
              <section key={nodeId} className="rounded-xl border border-canvas-border bg-black/25 p-3 shadow-inner">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="truncate font-mono text-xs text-canvas-accent">{nodeId}</h4>
                  <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-slate-400">
                    {fields.length} {fields.length === 1 ? "field" : "fields"}
                  </span>
                </div>
                <div className="space-y-2">
                  {fields.map(([key, value]) => (
                    <article key={`${nodeId}-${key}`} className="rounded-lg border border-white/[0.06] bg-black/20 p-2">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{key}</div>
                      <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-slate-300">
                        {truncate(renderValue(value))}
                      </pre>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {Object.keys(referenceOutputs).length > 0 ? (
        <details className="rounded-xl border border-canvas-border bg-black/20 p-3">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Upstream reference outputs ({Object.keys(referenceOutputs).length})
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-white/[0.06] bg-black/30 p-2 font-mono text-[10px] leading-relaxed text-slate-300">
            {renderValue(referenceOutputs)}
          </pre>
        </details>
      ) : null}

      <details className="rounded-xl border border-canvas-border bg-black/20 p-3">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Raw collector JSON
        </summary>
        <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-white/[0.06] bg-black/30 p-2 font-mono text-[10px] leading-relaxed text-slate-300">
          {renderValue(collectorOutput)}
        </pre>
      </details>
    </div>
  );
}
