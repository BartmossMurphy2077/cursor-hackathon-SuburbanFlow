import { useCallback, useEffect } from "react";
import { parseGlobalContextJson, validateGraphForRun, withPrompt } from "../lib/graph";
import { authFetch, sseUrl } from "../lib/api";
import { useCanvasStore } from "../stores/canvasStore";
import { useRunStore } from "../stores/runStore";
import { useThemeStore } from "../stores/themeStore";

function autoLayoutNodes() {
  const store = useCanvasStore.getState();
  const { nodes, edges } = store;
  if (nodes.length === 0) return;

  const adj: Record<string, string[]> = {};
  const indeg: Record<string, number> = {};
  for (const n of nodes) { adj[n.id] = []; indeg[n.id] = 0; }
  for (const e of edges) {
    if (adj[e.source]) adj[e.source].push(e.target);
    if (e.target in indeg) indeg[e.target]++;
  }
  const layers: string[][] = [];
  let queue = Object.keys(indeg).filter((id) => indeg[id] === 0);
  while (queue.length > 0) {
    layers.push(queue);
    const next: string[] = [];
    for (const id of queue) {
      for (const t of adj[id] ?? []) {
        indeg[t]--;
        if (indeg[t] === 0) next.push(t);
      }
    }
    queue = next;
  }
  const orphans = nodes.filter((n) => !layers.flat().includes(n.id));
  if (orphans.length) layers.push(orphans.map((n) => n.id));

  const X_GAP = 420;
  const Y_GAP = 60;
  const START_X = 60;
  const START_Y = 80;

  const posMap: Record<string, { x: number; y: number }> = {};
  for (let col = 0; col < layers.length; col++) {
    const layer = layers[col];
    const totalHeight = layer.length * 280 + (layer.length - 1) * Y_GAP;
    const topY = START_Y + Math.max(0, (400 - totalHeight) / 2);
    for (let row = 0; row < layer.length; row++) {
      posMap[layer[row]] = { x: START_X + col * X_GAP, y: topY + row * (280 + Y_GAP) };
    }
  }

  useCanvasStore.setState({
    nodes: nodes.map((n) => posMap[n.id] ? { ...n, position: posMap[n.id] } : n),
  });
}

export function Toolbar() {
  const sandboxName = useCanvasStore((s) => s.sandboxName);
  const sandboxId = useCanvasStore((s) => s.sandboxId);
  const setSandboxName = useCanvasStore((s) => s.setSandboxName);
  const prompt = useCanvasStore((s) => s.prompt);
  const setPrompt = useCanvasStore((s) => s.setPrompt);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const globalContextJson = useCanvasStore((s) => s.globalContextJson);

  const showToast = useCanvasStore((s) => s.showToast);
  const loadDemo = useCanvasStore((s) => s.loadDemo);

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const isRunning = useRunStore((s) => s.isRunning);
  const resetForNewRun = useRunStore((s) => s.resetForNewRun);
  const applyEvent = useRunStore((s) => s.applyEvent);
  const setRunId = useRunStore((s) => s.setRunId);
  const setRunning = useRunStore((s) => s.setRunning);
  const attachEventSource = useRunStore((s) => s.attachEventSource);

  const runPipelineRef = useCallback(() => { void runPipeline(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!isRunning) runPipelineRef();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isRunning, runPipelineRef]);

  const runPipeline = async () => {
    const parsedGlobal = parseGlobalContextJson(globalContextJson);
    if (!parsedGlobal.ok) {
      showToast(parsedGlobal.error);
      return;
    }
    const globalContext = parsedGlobal.value;

    const validation = validateGraphForRun(nodes, edges, globalContext);
    if (!validation.ok) {
      showToast(validation.error);
      return;
    }

    const payload = withPrompt(validation.payload, prompt);
    payload.sandbox_id = sandboxId ?? (sandboxName.replace(/\s+/g, "_").toLowerCase() || "canvas_sandbox");

    resetForNewRun();
    setRunning(true);

    let res: Response;
    try {
      res = await authFetch("/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      setRunning(false);
      showToast("Network error — is the API running?");
      return;
    }

    if (!res.ok) {
      setRunning(false);
      showToast(`Run failed to start (${res.status}).`);
      return;
    }

    const data = (await res.json()) as { run_id?: string };
    if (!data.run_id) {
      setRunning(false);
      showToast("No run_id in response.");
      return;
    }

    setRunId(data.run_id);

    const es = new EventSource(sseUrl(`/runs/${data.run_id}/events`));

    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as unknown;
        applyEvent(parsed);
      } catch {
        applyEvent({ type: "node_error", error: `Bad SSE payload: ${msg.data}` });
      }
    };

    es.addEventListener("end", () => {
      es.close();
      attachEventSource(null);
      setRunning(false);
    });

    es.onerror = () => {
      es.close();
      attachEventSource(null);
      setRunning(false);
      showToast("SSE error — check run snapshot at GET /runs/{id}.");
    };

    attachEventSource(es);
  };

  return (
    <header className="relative z-20 flex shrink-0 flex-wrap items-center gap-3 px-4 py-3 backdrop-blur-xl" style={{ borderBottom: "1px solid var(--ac-border)", background: "var(--ac-elevated)" }}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-canvas-accent/25 to-sky-500/10 shadow-panel ring-1 ring-white/10">
          <span className="font-mono text-sm font-bold text-canvas-accent">◇</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--ac-ink)" }}>AgentCanvas</span>
            <span className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ borderColor: "var(--ac-border)", background: "var(--ac-surface)", color: "var(--ac-muted)" }}>
              MVP
            </span>
          </div>
          <span className="text-[11px]" style={{ color: "var(--ac-muted)" }}>Visual pipeline · local run</span>
        </div>
      </div>
      <label className="ac-label flex min-w-[120px] max-w-[200px] flex-col normal-case">
        Sandbox
        <input className="ac-input normal-case" value={sandboxName} onChange={(e) => setSandboxName(e.target.value)} />
      </label>
      <label className="ac-label flex min-w-[180px] flex-1 flex-col normal-case">
        Global prompt
        <input
          className="ac-input normal-case"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What should this graph accomplish?"
        />
      </label>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ac-border)] transition hover:bg-[var(--ac-surface-hover)]"
        >
          {theme === "dark" ? (
            <svg className="h-4 w-4" style={{ color: "var(--ac-muted)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" style={{ color: "var(--ac-muted)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={autoLayoutNodes}
          title="Auto-layout nodes left-to-right"
          className="rounded-lg border border-[var(--ac-border)] px-3 py-2 text-sm font-medium shadow-panel transition hover:bg-[var(--ac-surface-hover)]"
          style={{ color: "var(--ac-muted)" }}
        >
          <svg className="inline-block h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => loadDemo()}
          className="rounded-lg border border-[var(--ac-border)] px-3.5 py-2 text-sm font-medium shadow-panel transition hover:bg-[var(--ac-surface-hover)]"
          style={{ color: "var(--ac-muted)" }}
        >
          Clear canvas
        </button>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => void runPipeline()}
          className="rounded-lg bg-gradient-to-r from-canvas-accent-dim to-canvas-accent px-5 py-2 text-sm font-semibold text-canvas-bg shadow-[0_0_24px_rgba(45,212,191,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isRunning ? "Running..." : "Run pipeline"}
          {!isRunning && <kbd className="ml-2 rounded border border-white/20 px-1.5 py-0.5 text-[9px] font-normal opacity-60">Ctrl+Enter</kbd>}
        </button>
      </div>
    </header>
  );
}
