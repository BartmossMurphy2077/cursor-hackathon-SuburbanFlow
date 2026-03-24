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
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-lg border border-amber-900/80 bg-amber-950/95 px-4 py-2 text-center text-sm text-amber-100 shadow-lg"
    >
      {toast}
    </div>
  );
}
