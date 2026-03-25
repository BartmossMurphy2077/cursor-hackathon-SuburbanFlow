import { create } from "zustand";

export type NodeRunStatus = "idle" | "running" | "done" | "error";

type SseEvent =
  | { type: "node_start"; node_id: string }
  | { type: "token_chunk"; node_id: string; chunk: string }
  | { type: "node_complete"; node_id: string; output: Record<string, unknown> }
  | { type: "node_error"; node_id?: string; error: string }
  | { type: "run_complete"; collector_output?: unknown }
  | { type: "stream_end" };

export type RunToast = { message: string; kind: "success" | "error" } | null;

type RunState = {
  runId: string | null;
  isRunning: boolean;
  eventLines: string[];
  nodeStatus: Record<string, NodeRunStatus>;
  streamText: Record<string, string>;
  nodeOutputs: Record<string, Record<string, unknown>>;
  collectorOutput: unknown | null;
  lastError: string | null;
  eventSource: EventSource | null;
  runToast: RunToast;

  resetForNewRun: () => void;
  appendLog: (line: string) => void;
  applyEvent: (raw: unknown) => void;
  closeStream: () => void;
  setRunId: (id: string | null) => void;
  setRunning: (v: boolean) => void;
  attachEventSource: (es: EventSource | null) => void;
  clearRunToast: () => void;
  _showRunToast?: (message: string, kind: "success" | "error") => void;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export const useRunStore = create<RunState>((set, get) => ({
  runId: null,
  isRunning: false,
  eventLines: [],
  nodeStatus: {},
  streamText: {},
  nodeOutputs: {},
  collectorOutput: null,
  lastError: null,
  eventSource: null,
  runToast: null,

  clearRunToast: () => set({ runToast: null }),
  _showRunToast: (message, kind) => set({ runToast: { message, kind } }),

  resetForNewRun: () => {
    get().closeStream();
    set({
      runId: null,
      isRunning: false,
      eventLines: [],
      nodeStatus: {},
      streamText: {},
      nodeOutputs: {},
      collectorOutput: null,
      lastError: null,
    });
  },

  appendLog: (line) =>
    set((s) => ({
      eventLines: [...s.eventLines.slice(-400), line],
    })),

  closeStream: () => {
    const es = get().eventSource;
    if (es) {
      es.close();
      set({ eventSource: null });
    }
  },

  setRunId: (id) => set({ runId: id }),
  setRunning: (v) => set({ isRunning: v }),
  attachEventSource: (es) => set({ eventSource: es }),

  applyEvent: (raw) => {
    if (!isRecord(raw)) {
      get().appendLog(`(invalid event) ${JSON.stringify(raw)}`);
      return;
    }
    if (Object.keys(raw).length === 0) return;
    if (typeof raw.type !== "string") {
      get().appendLog(`(invalid event) ${JSON.stringify(raw)}`);
      return;
    }
    const ev = raw as SseEvent;
    get().appendLog(JSON.stringify(ev));

    switch (ev.type) {
      case "node_start":
        set((s) => ({
          nodeStatus: { ...s.nodeStatus, [ev.node_id]: "running" },
          streamText: { ...s.streamText, [ev.node_id]: "" },
        }));
        break;
      case "token_chunk": {
        const chunk = typeof ev.chunk === "string" ? ev.chunk : "";
        set((s) => ({
          streamText: {
            ...s.streamText,
            [ev.node_id]: (s.streamText[ev.node_id] ?? "") + chunk,
          },
        }));
        break;
      }
      case "node_complete":
        set((s) => ({
          nodeStatus: { ...s.nodeStatus, [ev.node_id]: "done" },
          nodeOutputs: { ...s.nodeOutputs, [ev.node_id]: ev.output },
        }));
        break;
      case "node_error": {
        const nid = ev.node_id;
        set((s) => ({
          lastError: ev.error,
          ...(nid
            ? { nodeStatus: { ...s.nodeStatus, [nid]: "error" } }
            : {}),
        }));
        get()._showRunToast?.(
          nid ? `Node "${nid}" failed: ${ev.error.slice(0, 100)}` : `Error: ${ev.error.slice(0, 100)}`,
          "error",
        );
        break;
      }
      case "run_complete": {
        const doneCount = Object.values(get().nodeStatus).filter((s) => s === "done").length;
        set({ collectorOutput: ev.collector_output ?? null, isRunning: false });
        get()._showRunToast?.(`Pipeline complete — ${doneCount} agent${doneCount !== 1 ? "s" : ""} finished`, "success");
        break;
      }
      case "stream_end":
        get().closeStream();
        set({ isRunning: false });
        break;
      default:
        get().appendLog(`(unknown type) ${JSON.stringify(raw)}`);
    }
  },
}));
