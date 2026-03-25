import { validateGraphForRun, withPrompt } from "../lib/graph";
import { authFetch, sseUrl } from "../lib/api";
import { useCanvasStore } from "../stores/canvasStore";
import { useRunStore } from "../stores/runStore";

export function Toolbar() {
  const sandboxName = useCanvasStore((s) => s.sandboxName);
  const setSandboxName = useCanvasStore((s) => s.setSandboxName);
  const prompt = useCanvasStore((s) => s.prompt);
  const setPrompt = useCanvasStore((s) => s.setPrompt);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const globalContextJson = useCanvasStore((s) => s.globalContextJson);
  const setGlobalContextJson = useCanvasStore((s) => s.setGlobalContextJson);
  const showToast = useCanvasStore((s) => s.showToast);
  const loadDemo = useCanvasStore((s) => s.loadDemo);

  const isRunning = useRunStore((s) => s.isRunning);
  const resetForNewRun = useRunStore((s) => s.resetForNewRun);
  const applyEvent = useRunStore((s) => s.applyEvent);
  const setRunId = useRunStore((s) => s.setRunId);
  const setRunning = useRunStore((s) => s.setRunning);
  const attachEventSource = useRunStore((s) => s.attachEventSource);

  const runPipeline = async () => {
    let globalContext: Record<string, unknown> = {};
    try {
      globalContext = JSON.parse(globalContextJson || "{}") as Record<string, unknown>;
      if (globalContext === null || typeof globalContext !== "object" || Array.isArray(globalContext)) {
        throw new Error("Global context must be a JSON object.");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Invalid global context JSON.");
      return;
    }

    const validation = validateGraphForRun(nodes, edges, globalContext);
    if (!validation.ok) {
      showToast(validation.error);
      return;
    }

    const payload = withPrompt(validation.payload, prompt);
    payload.sandbox_id = sandboxName.replace(/\s+/g, "_").toLowerCase() || "canvas_sandbox";

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
    <header className="relative z-20 flex shrink-0 flex-wrap items-center gap-3 border-b border-canvas-border bg-canvas-elevated/80 px-4 py-3 shadow-bar backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-canvas-accent/25 to-sky-500/10 shadow-panel ring-1 ring-white/10">
          <span className="font-mono text-sm font-bold text-canvas-accent">◇</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-white">AgentCanvas</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              MVP
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Visual pipeline · local run</span>
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
      <label className="ac-label flex w-44 flex-col font-mono normal-case">
        Context JSON
        <input
          className="ac-input font-mono text-xs normal-case"
          value={globalContextJson}
          onChange={(e) => setGlobalContextJson(e.target.value)}
          title="global_context object sent with the run"
        />
      </label>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => loadDemo()}
          className="rounded-lg border border-canvas-border bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-slate-300 shadow-panel transition hover:bg-white/[0.06] hover:text-white"
        >
          Reset demo
        </button>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => void runPipeline()}
          className="rounded-lg bg-gradient-to-r from-canvas-accent-dim to-canvas-accent px-5 py-2 text-sm font-semibold text-canvas-bg shadow-[0_0_24px_rgba(45,212,191,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isRunning ? "Running…" : "Run pipeline"}
        </button>
      </div>
    </header>
  );
}
