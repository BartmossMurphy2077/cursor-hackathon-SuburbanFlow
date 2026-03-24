import { useEffect } from "react";

import { useCanvasStore } from "../stores/canvasStore";

export function Toast() {
  const toast = useCanvasStore((s) => s.toast);
  const clearToast = useCanvasStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => clearToast(), 4200);
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-xl border border-white/10 bg-canvas-elevated/95 px-5 py-3 text-center text-sm text-slate-200 shadow-bar backdrop-blur-xl ring-1 ring-white/5"
    >
      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
      {toast}
    </div>
  );
}
