import { create } from "zustand";

export type NodeRunStatus = "idle" | "running" | "done" | "error";

type SseEvent =
  | { type: "node_start"; node_id: string }
  | { type: "token_chunk"; node_id: string; chunk: string }
  | { type: "node_complete"; node_id: string; output: Record<string, unknown> }
  | { type: "node_error"; node_id?: string; error: string }
  | { type: "run_complete"; collector_output?: unknown }
  | { type: "stream_end" };

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

  resetForNewRun: () => void;
  appendLog: (line: string) => void;
  applyEvent: (raw: unknown) => void;
  closeStream: () => void;
  setRunId: (id: string | null) => void;
  setRunning: (v: boolean) => void;
  attachEventSource: (es: EventSource | null) => void;
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
        break;
      }
      case "run_complete":
        set({ collectorOutput: ev.collector_output ?? null, isRunning: false });
        break;
      case "stream_end":
        get().closeStream();
        set({ isRunning: false });
        break;
      default:
        get().appendLog(`(unknown type) ${JSON.stringify(raw)}`);
    }
  },
}));
