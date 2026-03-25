import { useEffect } from "react";

import { useCanvasStore } from "../stores/canvasStore";
import { useRunStore } from "../stores/runStore";

export function Toast() {
  const toast = useCanvasStore((s) => s.toast);
  const clearToast = useCanvasStore((s) => s.clearToast);
  const runToast = useRunStore((s) => s.runToast);
  const clearRunToast = useRunStore((s) => s.clearRunToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => clearToast(), 4200);
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);

  useEffect(() => {
    if (!runToast) return;
    const t = window.setTimeout(() => clearRunToast(), 5000);
    return () => window.clearTimeout(t);
  }, [runToast, clearRunToast]);

  const dotColor = runToast
    ? runToast.kind === "success"
      ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
      : "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.6)]"
    : "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]";

  const message = runToast?.message ?? toast;
  if (!message) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-lg -translate-x-1/2 rounded-xl border px-5 py-3 text-center text-sm backdrop-blur-xl"
      style={{
        borderColor: "var(--ac-border)",
        background: "var(--ac-elevated)",
        color: "var(--ac-ink)",
        boxShadow: "0 0 0 1px var(--ac-border), 0 8px 32px rgba(0,0,0,0.35)",
      }}
    >
      <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${dotColor}`} />
      {message}
    </div>
  );
}
