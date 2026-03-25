import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const isDark = useThemeStore((s) => s.theme === "dark");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate("/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4" style={{ backgroundColor: "var(--ac-bg)" }}>
      <div
        className="w-full max-w-sm space-y-6 rounded-2xl border p-8"
        style={{
          borderColor: isDark ? "rgba(45,212,191,0.2)" : "rgba(0,0,0,0.1)",
          backgroundColor: isDark ? "#0f1219" : "#ffffff",
          boxShadow: isDark
            ? "0 0 0 1px rgba(45,212,191,0.1), 0 20px 60px rgba(0,0,0,0.5)"
            : "0 1px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-canvas-accent/25 to-sky-500/10 ring-1 ring-canvas-accent/25">
            <span className="font-mono text-lg font-bold text-canvas-accent">◇</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--ac-ink)" }}>AgentCanvas</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ac-muted)" }}>Sign in to your account</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 px-4 py-2.5 text-sm text-red-400" style={{ background: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.05)" }}>
              {error}
              <button type="button" onClick={clearError} className="ml-2 font-medium underline">Dismiss</button>
            </div>
          )}

          <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ac-muted)" }}>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ac-input"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ac-muted)" }}>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ac-input"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-canvas-accent-dim to-canvas-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(45,212,191,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--ac-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-medium text-canvas-accent hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
