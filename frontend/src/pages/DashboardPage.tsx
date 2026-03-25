import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ThemeToggle } from "../components/ThemeToggle";
import { authFetch } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

type SandboxItem = {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
};

type RunSummary = {
  run_id: string;
  sandbox_id: string;
  status: "pending" | "running" | "done" | "failed";
  created_at: string;
  completed_at?: string | null;
  error?: string | null;
};

const statusStyles: Record<RunSummary["status"], string> = {
  pending: "bg-slate-500/20 text-slate-300 ring-slate-500/30",
  running: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
  done: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
  failed: "bg-rose-500/20 text-rose-300 ring-rose-500/30",
};

export function DashboardPage() {
  const [sandboxes, setSandboxes] = useState<SandboxItem[]>([]);
  const [runsBySandbox, setRunsBySandbox] = useState<Record<string, RunSummary[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const email = useAuthStore((s) => s.email);
  const logout = useAuthStore((s) => s.logout);

  const sandboxCountLabel = useMemo(() => {
    if (sandboxes.length === 1) return "1 sandbox";
    return `${sandboxes.length} sandboxes`;
  }, [sandboxes.length]);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sandboxRes = await authFetch("/sandboxes");
      if (!sandboxRes.ok) {
        setError(`Failed to load sandboxes (${sandboxRes.status}).`);
        setIsLoading(false);
        return;
      }
      const sandboxData = (await sandboxRes.json()) as SandboxItem[];
      setSandboxes(sandboxData);

      const runEntries = await Promise.all(
        sandboxData.map(async (sb) => {
          const res = await authFetch(`/sandboxes/${sb.id}/runs`);
          if (!res.ok) return [sb.id, []] as const;
          const runs = (await res.json()) as RunSummary[];
          return [sb.id, runs.slice(0, 5)] as const;
        }),
      );
      setRunsBySandbox(Object.fromEntries(runEntries));
    } catch {
      setError("Network error while loading dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const createSandbox = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const res = await authFetch("/sandboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: newDesc.trim() || null }),
      });
      if (!res.ok) {
        setError(`Failed to create sandbox (${res.status}).`);
        return;
      }
      const created = (await res.json()) as SandboxItem;
      setNewName("");
      setNewDesc("");
      navigate(`/sandbox/${created.id}`);
    } catch {
      setError("Network error while creating sandbox.");
    } finally {
      setIsCreating(false);
    }
  };

  const deleteSandbox = async (sandboxId: string) => {
    if (!window.confirm("Delete this sandbox and all runs?")) return;
    const res = await authFetch(`/sandboxes/${sandboxId}`, { method: "DELETE" });
    if (!res.ok) {
      setError(`Failed to delete sandbox (${res.status}).`);
      return;
    }
    setSandboxes((prev) => prev.filter((s) => s.id !== sandboxId));
    setRunsBySandbox((prev) => {
      const next = { ...prev };
      delete next[sandboxId];
      return next;
    });
  };

  return (
    <div className="min-h-full px-6 py-6 text-canvas-ink" style={{ backgroundColor: "var(--ac-bg)" }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-canvas-border bg-canvas-elevated/75 p-5 shadow-bar backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-canvas-muted">Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-canvas-ink">Your sandboxes and workflows</h1>
              <p className="mt-1 text-sm text-canvas-muted">
                {sandboxCountLabel} · {email ?? "signed in"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="rounded-lg border border-canvas-border bg-canvas-ink/[0.03] px-3.5 py-2 text-sm text-canvas-muted hover:bg-canvas-ink/[0.06]"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-sm text-rose-300 hover:bg-rose-500/15"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-canvas-border bg-canvas-elevated/70 p-5 shadow-panel backdrop-blur-xl">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-canvas-muted">Create sandbox</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              className="ac-input mt-0"
              placeholder="Sandbox name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="ac-input mt-0"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void createSandbox()}
              disabled={isCreating || !newName.trim()}
              className="rounded-lg bg-gradient-to-r from-canvas-accent-dim to-canvas-accent px-4 py-2 text-sm font-semibold text-canvas-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create and open"}
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className="rounded-xl border border-canvas-border bg-canvas-elevated/70 p-4 text-sm text-canvas-muted">Loading dashboard...</div>
          ) : sandboxes.length === 0 ? (
            <div className="rounded-xl border border-canvas-border bg-canvas-elevated/70 p-4 text-sm text-canvas-muted">
              No sandboxes yet. Create one to start building workflows.
            </div>
          ) : (
            sandboxes.map((sandbox) => {
              const runs = runsBySandbox[sandbox.id] ?? [];
              return (
                <article
                  key={sandbox.id}
                  className="rounded-2xl border border-canvas-border bg-canvas-elevated/70 p-4 shadow-panel backdrop-blur-xl"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-canvas-ink">{sandbox.name}</h3>
                      <p className="mt-0.5 truncate text-xs text-canvas-muted">{sandbox.description || "No description"}</p>
                    </div>
                    <span className="rounded bg-canvas-ink/[0.05] px-2 py-0.5 text-[10px] text-canvas-muted">
                      {runs.length} runs
                    </span>
                  </div>

                  <div className="space-y-1.5 rounded-xl border border-canvas-border bg-canvas-bg/20 p-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-canvas-muted">Recent workflows</div>
                    {runs.length === 0 ? (
                      <div className="text-xs text-canvas-muted">No runs yet.</div>
                    ) : (
                      runs.map((run) => (
                        <div key={run.run_id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-mono text-canvas-muted">{run.run_id.slice(0, 8)}</span>
                          <span className={`rounded px-1.5 py-0.5 ring-1 ${statusStyles[run.status]}`}>{run.status}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/sandbox/${sandbox.id}`)}
                      className="rounded-lg bg-canvas-accent px-3 py-1.5 text-sm font-semibold text-canvas-bg hover:brightness-110"
                    >
                      Open workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSandbox(sandbox.id)}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/15"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
