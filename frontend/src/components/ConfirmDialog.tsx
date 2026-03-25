import { useThemeStore } from "../stores/themeStore";

type ConfirmDialogProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  const isDark = useThemeStore((s) => s.theme === "dark");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0" style={{ background: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)" }} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border p-6"
        style={{
          borderColor: isDark ? "rgba(45,212,191,0.2)" : "rgba(0,0,0,0.1)",
          backgroundColor: isDark ? "#0f1219" : "#ffffff",
          boxShadow: isDark
            ? "0 0 0 1px rgba(45,212,191,0.1), 0 20px 60px rgba(0,0,0,0.6)"
            : "0 4px 24px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm leading-relaxed" style={{ color: isDark ? "#e2e8f0" : "#1e293b" }}>
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:brightness-110"
            style={{
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              color: isDark ? "#94a3b8" : "#64748b",
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
