/**
 * Strips common LLM output artifacts at display time.
 * Raw data is preserved in stores/DB — this is cosmetic only.
 */

const BOILERPLATE_RE = /^(Sure[,!]?\s*(here('s| is))?|Certainly[!.]?\s*(Here('s| is))?|Of course[!.]?\s*(Here('s| is))?|Here('s| is)\s+(the|my|a|your)\s+)/i;

const ANTHROPIC_XML_TAGS = [
  "result",
  "output",
  "response",
  "answer",
  "artifact",
];

function stripOuterCodeFence(text: string): string {
  const fenceRe = /^```[\w-]*\s*\n([\s\S]*?)\n\s*```\s*$/;
  const m = text.match(fenceRe);
  return m ? m[1] : text;
}

function stripXmlWrappers(text: string): string {
  let result = text;
  for (const tag of ANTHROPIC_XML_TAGS) {
    const re = new RegExp(
      `^\\s*<${tag}[^>]*>\\s*\\n?([\\s\\S]*?)\\n?\\s*</${tag}>\\s*$`,
      "i",
    );
    const m = result.match(re);
    if (m) {
      result = m[1];
    }
  }
  return result;
}

function stripBoilerplateOpener(text: string): string {
  const lines = text.split("\n");
  if (lines.length > 1 && BOILERPLATE_RE.test(lines[0])) {
    const rest = lines.slice(1).join("\n").trimStart();
    if (rest.length > 0) return rest;
  }
  return text;
}

export function stripModelArtifacts(
  text: string,
  _provider?: "anthropic" | "openai" | string,
): string {
  if (!text) return text;
  let cleaned = text.trim();
  cleaned = stripOuterCodeFence(cleaned);
  cleaned = stripXmlWrappers(cleaned);
  cleaned = stripBoilerplateOpener(cleaned);
  return cleaned.trim();
}
