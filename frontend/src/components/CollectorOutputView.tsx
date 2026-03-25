import { useState, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stripModelArtifacts } from "../lib/stripArtifacts";

type CollectorOutputViewProps = {
  collectorOutput: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively collect all string values from a nested object.
 * Skips keys that are metadata (like "graph") rather than content.
 */
function collectStrings(value: unknown, skipKeys = new Set(["graph"])): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => collectStrings(v, skipKeys));
  if (isRecord(value)) {
    const results: string[] = [];
    for (const [key, val] of Object.entries(value)) {
      if (skipKeys.has(key)) continue;
      results.push(...collectStrings(val, skipKeys));
    }
    return results;
  }
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  return [];
}

function extractDisplayText(value: unknown): string {
  if (typeof value === "string") return value;

  const strings = collectStrings(value);

  if (strings.length === 0) {
    return typeof value === "object"
      ? JSON.stringify(value, null, 2)
      : String(value);
  }

  // If there's only one string and it already looks like markdown, use it directly
  if (strings.length === 1) return strings[0];

  // Multiple strings: join with section breaks, skip near-duplicates
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const s of strings) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    const fingerprint = trimmed.slice(0, 200);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    unique.push(trimmed);
  }

  return unique.join("\n\n---\n\n");
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CollectorOutputView({ collectorOutput }: CollectorOutputViewProps) {
  const [tab, setTab] = useState<"rendered" | "raw">("rendered");

  const displayText = useMemo(
    () => stripModelArtifacts(extractDisplayText(collectorOutput)),
    [collectorOutput],
  );
  const rawJson = useMemo(
    () => (typeof collectorOutput === "string" ? collectorOutput : JSON.stringify(collectorOutput, null, 2)),
    [collectorOutput],
  );

  const handleDownload = useCallback(() => {
    const isJson = typeof collectorOutput !== "string" && isRecord(collectorOutput);
    if (tab === "raw" && isJson) {
      downloadBlob(rawJson, "collector-output.json");
    } else {
      downloadBlob(displayText, "collector-output.md");
    }
  }, [tab, collectorOutput, rawJson, displayText]);

  if (collectorOutput == null) {
    return (
      <div className="rounded-xl border p-4 text-sm shadow-inner" style={{ borderColor: "var(--ac-border)", background: "var(--ac-surface)", color: "var(--ac-muted)" }}>
        Run the pipeline to generate the collector result.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Tab bar + download */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setTab("rendered")}
          className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
            tab === "rendered"
              ? "bg-canvas-accent/15 text-canvas-accent ring-1 ring-canvas-accent/30"
              : "text-canvas-muted hover:text-canvas-ink"
          }`}
        >
          Rendered
        </button>
        <button
          type="button"
          onClick={() => setTab("raw")}
          className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
            tab === "raw"
              ? "bg-canvas-accent/15 text-canvas-accent ring-1 ring-canvas-accent/30"
              : "text-canvas-muted hover:text-canvas-ink"
          }`}
        >
          Raw
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleDownload}
          title="Download output"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-canvas-muted transition hover:bg-canvas-ink/[0.06] hover:text-canvas-ink"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download
        </button>
      </div>

      {/* Content */}
      {tab === "rendered" ? (
        <div className="collector-prose max-h-[28rem] overflow-auto rounded-xl border p-4 shadow-inner" style={{ borderColor: "var(--ac-border)", background: "var(--ac-surface)" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
        </div>
      ) : (
        <pre className="max-h-[28rem] overflow-auto rounded-xl border p-4 font-mono text-[10px] leading-relaxed shadow-inner" style={{ borderColor: "var(--ac-border)", background: "var(--ac-surface)", color: "var(--ac-muted)" }}>
          {rawJson}
        </pre>
      )}
    </div>
  );
}
