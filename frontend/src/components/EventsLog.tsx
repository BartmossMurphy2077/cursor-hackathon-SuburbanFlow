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
    <div className="relative flex h-full shrink-0 flex-col backdrop-blur-md" style={{ borderTop: "1px solid var(--ac-border)", background: "var(--ac-elevated)" }}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-canvas-accent/30 to-transparent" />
      <div className="flex shrink-0 items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid var(--ac-border)" }}>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-canvas-accent shadow-[0_0_8px_rgba(45,212,191,0.7)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--ac-muted)" }}>Event stream</span>
        </div>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-[10px] font-medium transition hover:brightness-110"
          style={{ color: "var(--ac-muted)" }}
          onClick={() => useRunStore.setState({ eventLines: [] })}
        >
          Clear
        </button>
      </div>
      <pre
        ref={preRef}
        className="min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[10px] leading-relaxed"
        style={{ background: "var(--ac-surface)", color: "var(--ac-muted)" }}
      >
        {lines.length ? lines.join("\n") : "Run the pipeline — live execution events land here."}
      </pre>
    </div>
  );
}
