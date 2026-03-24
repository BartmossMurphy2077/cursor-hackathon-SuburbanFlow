import { validateGraphForRun, withPrompt } from "../lib/graph";
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
      res = await fetch("/runs", {
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

    const es = new EventSource(`/runs/${data.run_id}/events`);

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
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-canvas-border bg-canvas-panel/95 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tracking-tight text-slate-100">AgentCanvas</span>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-400">MVP</span>
      </div>
      <label className="flex min-w-[120px] max-w-[200px] flex-col text-[10px] font-medium uppercase text-slate-500">
        Sandbox
        <input
          className="mt-0.5 rounded border border-canvas-border bg-canvas-bg px-2 py-1 text-sm font-normal normal-case text-slate-100"
          value={sandboxName}
          onChange={(e) => setSandboxName(e.target.value)}
        />
      </label>
      <label className="flex min-w-[180px] flex-1 flex-col text-[10px] font-medium uppercase text-slate-500">
        Global prompt
        <input
          className="mt-0.5 rounded border border-canvas-border bg-canvas-bg px-2 py-1 text-sm font-normal normal-case text-slate-100"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Task for the pipeline…"
        />
      </label>
      <label className="flex w-40 flex-col text-[10px] font-medium uppercase text-slate-500">
        Context JSON
        <input
          className="mt-0.5 rounded border border-canvas-border bg-canvas-bg px-2 py-1 font-mono text-xs font-normal normal-case text-slate-100"
          value={globalContextJson}
          onChange={(e) => setGlobalContextJson(e.target.value)}
          title="global_context object sent with the run"
        />
      </label>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => loadDemo()}
          className="rounded-lg border border-canvas-border bg-canvas-bg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Reset demo
        </button>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => void runPipeline()}
          className="rounded-lg bg-canvas-accent px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running…" : "Run pipeline"}
        </button>
      </div>
    </header>
  );
}
