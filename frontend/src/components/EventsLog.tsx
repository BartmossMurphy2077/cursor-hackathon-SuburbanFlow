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
    <div className="relative flex h-40 shrink-0 flex-col border-t border-canvas-border bg-[#06080c]/90 backdrop-blur-md">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-canvas-accent/30 to-transparent" />
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-canvas-accent shadow-[0_0_8px_rgba(45,212,191,0.7)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Event stream</span>
        </div>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          onClick={() => useRunStore.setState({ eventLines: [] })}
        >
          Clear
        </button>
      </div>
      <pre
        ref={preRef}
        className="min-h-0 flex-1 overflow-auto bg-black/20 px-4 py-3 font-mono text-[10px] leading-relaxed text-slate-500"
      >
        {lines.length ? lines.join("\n") : "Run the pipeline — live execution events land here."}
      </pre>
    </div>
  );
}
