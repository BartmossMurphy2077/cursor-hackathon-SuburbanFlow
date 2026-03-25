import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setLocalError("Passwords do not match.");
      return;
    }

    const ok = await register(email, password);
    if (ok) navigate("/dashboard", { replace: true });
  };

  const displayError = localError ?? error;

  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">AgentCanvas</h1>
          <p className="mt-1 text-sm text-slate-400">Create a new account</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {displayError && (
            <div
              className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-2.5 text-sm text-red-300"
              role="alert"
            >
              {displayError}
              <button
                type="button"
                onClick={() => { setLocalError(null); clearError(); }}
                className="ml-2 font-medium underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <label className="block text-xs font-medium uppercase text-slate-400">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-canvas-border bg-canvas-bg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-xs font-medium uppercase text-slate-400">
            Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-canvas-border bg-canvas-bg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              placeholder="Min 8 characters"
            />
          </label>

          <label className="block text-xs font-medium uppercase text-slate-400">
            Confirm password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-canvas-border bg-canvas-bg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              placeholder="Repeat password"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-canvas-accent px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-canvas-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
