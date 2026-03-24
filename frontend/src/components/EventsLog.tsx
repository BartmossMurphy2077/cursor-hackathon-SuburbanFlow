import { useEffect, useRef } from "react";

import { useRunStore } from "../stores/runStore";

export function EventsLog() {
  const lines = useRunStore((s) => s.eventLines);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = preRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="flex h-36 shrink-0 flex-col border-t border-canvas-border bg-canvas-panel/95">
      <div className="flex shrink-0 items-center justify-between border-b border-canvas-border px-3 py-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">SSE events</span>
        <button
          type="button"
          className="text-[10px] text-canvas-muted hover:text-slate-300"
          onClick={() => useRunStore.setState({ eventLines: [] })}
        >
          Clear
        </button>
      </div>
      <pre
        ref={preRef}
        className="min-h-0 flex-1 overflow-auto p-2 font-mono text-[10px] leading-relaxed text-slate-400"
      >
        {lines.length ? lines.join("\n") : "Run the pipeline to stream events here."}
      </pre>
    </div>
  );
}
