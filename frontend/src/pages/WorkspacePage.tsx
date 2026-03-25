import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { EventsLog } from "../components/EventsLog";
import { FlowCanvas } from "../components/FlowCanvas";
import { Inspector } from "../components/Inspector";
import { Palette } from "../components/Palette";
import { ResizeHandle } from "../components/ResizeHandle";
import { Toast } from "../components/Toast";
import { Toolbar } from "../components/Toolbar";
import { authFetch } from "../lib/api";
import { buildPipelineGraphPayload, parseGlobalContextJson, type PipelineGraphPayload } from "../lib/graph";
import { useCanvasStore } from "../stores/canvasStore";

type SandboxDetail = {
  id: string;
  name: string;
};

export function WorkspacePage() {
  const { sandboxId } = useParams<{ sandboxId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const setSandboxMeta = useCanvasStore((s) => s.setSandboxMeta);
  const loadGraphFromApi = useCanvasStore((s) => s.loadGraphFromApi);
  const showToast = useCanvasStore((s) => s.showToast);
  const pendingDelete = useCanvasStore((s) => s.pendingDelete);
  const confirmDelete = useCanvasStore((s) => s.confirmDelete);
  const cancelDelete = useCanvasStore((s) => s.cancelDelete);
  const pendingClear = useCanvasStore((s) => s.pendingClear);
  const confirmClear = useCanvasStore((s) => s.confirmClear);
  const cancelClear = useCanvasStore((s) => s.cancelClear);

  const [showLibrary, setShowLibrary] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [libraryW, setLibraryW] = useState(216);
  const [inspectorW, setInspectorW] = useState(352);
  const [eventsH, setEventsH] = useState(160);

  const resizeLibrary = useCallback((d: number) => setLibraryW((w) => Math.max(140, Math.min(400, w + d))), []);
  const resizeInspector = useCallback((d: number) => setInspectorW((w) => Math.max(200, Math.min(500, w + d))), []);
  const resizeEvents = useCallback((d: number) => setEventsH((h) => Math.max(60, Math.min(400, h - d))), []);

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const globalContextJson = useCanvasStore((s) => s.globalContextJson);
  const activeSandboxId = useCanvasStore((s) => s.sandboxId);

  const lastSavedHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sandboxId) {
      navigate("/dashboard", { replace: true });
      return;
    }

    let cancelled = false;
    const loadSandbox = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [metaRes, graphRes] = await Promise.all([
          authFetch(`/sandboxes/${sandboxId}`),
          authFetch(`/sandboxes/${sandboxId}/graph`),
        ]);
        if (!metaRes.ok || !graphRes.ok) {
          setLoadError(`Unable to open sandbox (${metaRes.status}/${graphRes.status}).`);
          setIsLoading(false);
          return;
        }
        const meta = (await metaRes.json()) as SandboxDetail;
        const graph = (await graphRes.json()) as PipelineGraphPayload;
        if (cancelled) return;
        setSandboxMeta({ id: meta.id, name: meta.name });
        loadGraphFromApi(graph);
      } catch {
        if (!cancelled) setLoadError("Network error while opening sandbox.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadSandbox();
    return () => {
      cancelled = true;
    };
  }, [sandboxId, navigate, setSandboxMeta, loadGraphFromApi]);

  useEffect(() => {
    if (!sandboxId || isLoading || activeSandboxId !== sandboxId) return;

    const parsed = parseGlobalContextJson(globalContextJson);
    if (!parsed.ok) return;

    const graphValidation = buildPipelineGraphPayload(nodes, edges, parsed.value);
    if (!graphValidation.ok) return;

    const graphBody = JSON.stringify(graphValidation.graph);
    if (lastSavedHashRef.current === graphBody) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        const res = await authFetch(`/sandboxes/${sandboxId}/graph`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: graphBody,
        });
        if (res.ok) {
          lastSavedHashRef.current = graphBody;
          setSaveNotice("Saved");
          window.setTimeout(() => setSaveNotice(null), 1100);
        }
      })();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeSandboxId, edges, globalContextJson, isLoading, nodes, sandboxId]);

  if (loadError) {
    return (
      <div className="flex min-h-full items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-300">
          <p className="text-sm">{loadError}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-lg bg-canvas-accent px-3 py-1.5 text-sm font-semibold text-canvas-bg"
            >
              Back to dashboard
            </button>
            <button
              type="button"
              onClick={() => showToast("Try reloading this page.")}
              className="rounded-lg border border-canvas-border px-3 py-1.5 text-sm text-slate-300"
            >
              Help
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-slate-400">
        Loading sandbox workspace...
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-canvas-border/60 bg-canvas-bg/70 px-4 py-1.5 text-xs text-slate-400">
          <Link to="/dashboard" className="text-canvas-accent hover:underline">
            Back to dashboard
          </Link>
          <span>{saveNotice ?? "Autosave enabled"}</span>
        </div>
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          {showLibrary && (
            <>
              <div className="shrink-0 overflow-hidden" style={{ width: libraryW }}>
                <Palette />
              </div>
              <ResizeHandle direction="horizontal" side="right" onResize={resizeLibrary} />
            </>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Panel toggle bar */}
            <div className="flex shrink-0 items-center gap-1 px-2 py-1" style={{ borderBottom: "1px solid var(--ac-border)", background: "var(--ac-elevated)" }}>
              <button
                type="button"
                onClick={() => setShowLibrary((v) => !v)}
                className="rounded px-2 py-0.5 text-[10px] font-medium transition hover:brightness-110"
                style={{ color: showLibrary ? "var(--ac-accent)" : "var(--ac-muted)", background: showLibrary ? "rgba(45,212,191,0.1)" : "transparent" }}
              >
                Library
              </button>
              <button
                type="button"
                onClick={() => setShowEvents((v) => !v)}
                className="rounded px-2 py-0.5 text-[10px] font-medium transition hover:brightness-110"
                style={{ color: showEvents ? "var(--ac-accent)" : "var(--ac-muted)", background: showEvents ? "rgba(45,212,191,0.1)" : "transparent" }}
              >
                Events
              </button>
              <button
                type="button"
                onClick={() => setShowInspector((v) => !v)}
                className="rounded px-2 py-0.5 text-[10px] font-medium transition hover:brightness-110"
                style={{ color: showInspector ? "var(--ac-accent)" : "var(--ac-muted)", background: showInspector ? "rgba(45,212,191,0.1)" : "transparent" }}
              >
                Inspector
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <FlowCanvas />
            </div>
            {showEvents && (
              <>
                <ResizeHandle direction="vertical" side="top" onResize={resizeEvents} />
                <div className="shrink-0 overflow-hidden" style={{ height: eventsH }}>
                  <EventsLog />
                </div>
              </>
            )}
          </div>
          {showInspector && (
            <>
              <ResizeHandle direction="horizontal" side="left" onResize={resizeInspector} />
              <div className="shrink-0 overflow-y-auto overflow-x-hidden" style={{ width: inspectorW }}>
                <Inspector />
              </div>
            </>
          )}
        </div>
        <Toast />
        {pendingDelete && (
          <ConfirmDialog
            message={`Remove ${pendingDelete.names}${pendingDelete.edgeCount > 0 ? ` and ${pendingDelete.edgeCount} connection${pendingDelete.edgeCount > 1 ? "s" : ""}` : ""}?`}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />
        )}
        {pendingClear && (
          <ConfirmDialog
            message="Clear the entire canvas? All nodes, edges, and the prompt will be removed."
            onConfirm={confirmClear}
            onCancel={cancelClear}
          />
        )}
      </div>
    </div>
  );
}
