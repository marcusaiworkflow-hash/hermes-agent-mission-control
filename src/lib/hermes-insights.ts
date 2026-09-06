export type ModelUsage = { model: string; tokens?: number; cost?: number; calls?: number };
export type ActivityPattern = { label: string; value: number };
export type HermesInsights = {
  summary?: string | null; byModel?: ModelUsage[]; totalCost?: number | null; totalTokens?: number | null;
  inputTokens?: number | null; outputTokens?: number | null; sessions?: number | null; messages?: number | null;
  toolCalls?: number | null; peakHour?: string | null; activityPatterns?: ActivityPattern[]; syncedAt?: string | null;
};

const NUMBER = "([\\d,.]+(?:\\.[\\d]+)?(?:[kKmMbB])?)";
function numeric(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/,/g, "").trim(); const suffix = cleaned.slice(-1).toLowerCase();
  const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;
  const parsed = Number.parseFloat(multiplier === 1 ? cleaned : cleaned.slice(0, -1));
  return Number.isFinite(parsed) ? parsed * multiplier : null;
}
function metric(summary: string, labels: string[]): number | null {
  for (const label of labels) { const match = summary.match(new RegExp(`${label}\\s*(?:[:|=-]|\\s)\\s*\\$?\\s*${NUMBER}`, "i")); const parsed = numeric(match?.[1]); if (parsed != null) return parsed; }
  return null;
}
function magnitudeBeforeLabel(summary: string, label: string): number | null {
  const match = summary.match(new RegExp(`${NUMBER}\\s*${label}`, "i"));
  return numeric(match?.[1]);
}
function section(summary: string, heading: string): string {
  const lines = summary.split(/\r?\n/); const start = lines.findIndex((line) => new RegExp(heading, "i").test(line)); if (start < 0) return "";
  const selected: string[] = [];
  for (const line of lines.slice(start + 1)) { if (/^\s*(?:#{1,4}\s+|[A-Z][A-Z /&-]{3,}:?\s*)$/.test(line) && selected.some((entry) => entry.trim())) break; selected.push(line); }
  return selected.join("\n");
}
function cleanLine(value: string): string {
  return value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/[*_`]/g, "").trim();
}
function tableCells(line: string): string[] {
  const clean = cleanLine(line).replace(/^\s*[-*•]\s*/, "");
  if (/[|│┃]/.test(clean)) return clean.split(/[|│┃]/).map((cell) => cell.trim()).filter(Boolean);
  return clean.split(/\s{2,}/).map((cell) => cell.trim()).filter(Boolean);
}
function tableMetric(cell: string | undefined, kind: "tokens" | "cost" | "calls"): number | null {
  if (!cell) return null;
  if (kind === "cost") return numeric(cell.match(/\$\s*([\d,.]+(?:\.\d+)?(?:[kKmMbB])?)/)?.[1]);
  return numeric(cell.match(/([\d,.]+(?:\.\d+)?(?:[kKmMbB])?)/)?.[1]);
}
function parseModels(summary: string): ModelUsage[] {
  const body = section(summary, "model usage"); if (!body) return [];
  const lines = body.split(/\r?\n/); const rows = new Map<string, ModelUsage>();
  const headerIndex = lines.findIndex((line) => tableCells(line).some((cell) => /^model$/i.test(cell)));
  if (headerIndex >= 0) {
    const headers = tableCells(lines[headerIndex]).map((cell) => cell.toLowerCase());
    const modelIndex = headers.findIndex((cell) => cell === "model");
    const totalTokensIndex = headers.findIndex((cell) => /(?:total.*tokens?|tokens?.*total|^tokens?$|^tok(?:ens?)?$)/i.test(cell));
    const costIndex = headers.findIndex((cell) => /cost|spend/i.test(cell));
    const callsIndex = headers.findIndex((cell) => /calls?|requests?/i.test(cell));
    for (const raw of lines.slice(headerIndex + 1)) {
      const cells = tableCells(raw); const name = cells[modelIndex]?.trim();
      if (!name || /^(?:model|total)$/i.test(name) || /^[\s─━═-]+$/.test(name)) continue;
      const tokens = tableMetric(cells[totalTokensIndex], "tokens"); const cost = tableMetric(cells[costIndex], "cost"); const calls = tableMetric(cells[callsIndex], "calls");
      if (tokens == null && cost == null && calls == null) continue;
      rows.set(name, { model: name, ...(tokens != null ? { tokens } : {}), ...(cost != null ? { cost } : {}), ...(calls != null ? { calls } : {}) });
    }
  }
  for (const raw of lines) {
    const line = cleanLine(raw).replace(/^\s*[-*•]\s*/, ""); if (!line || /^model\s+/i.test(line)) continue;
    const match = line.match(/(?:`([^`]+)`|(.+?))\s*(?::|\||│|┃|—|\s{2,})/); const name = match?.[1] ?? match?.[2];
    if (!name || rows.has(name.trim()) || /^(?:model|total)$/i.test(name.trim())) continue;
    const tokens = metric(line, ["tokens?", "tok"]) ?? magnitudeBeforeLabel(line, "tokens?"); const calls = metric(line, ["calls?", "requests?"]) ?? magnitudeBeforeLabel(line, "calls?"); const costMatch = line.match(/\$\s*([\d,.]+)/);
    if (tokens == null && calls == null && !costMatch) continue;
    rows.set(name.trim(), { model: name.trim(), ...(tokens != null ? { tokens } : {}), ...(calls != null ? { calls } : {}), ...(costMatch ? { cost: numeric(costMatch[1]) ?? undefined } : {}) });
  }
  return [...rows.values()];
}
function parseActivity(summary: string): ActivityPattern[] {
  const body = section(summary, "activity patterns?"); if (!body) return [];
  return body.split(/\r?\n/).flatMap((raw) => { const match = raw.match(/^\s*[-*•]?\s*([^:|]+?)\s*(?::|\|)\s*([\d,.]+)\s*(?:sessions?|messages?|events?|actions?)?\s*$/i); const value = numeric(match?.[2]); return match?.[1] && value != null ? [{ label: match[1].trim(), value }] : []; });
}
export function normalizeInsights(input: HermesInsights | null): HermesInsights | null {
  if (!input) return null; const summary = typeof input.summary === "string" ? input.summary.replace(/[*_`]/g, "") : ""; const peakMatch = summary.match(/peak(?:\s+activity)?\s+hour\s*(?:[:|=-]|\bis\b)\s*([^\n]+)/i);
  const pick = (current: number | null | undefined, labels: string[]) => current ?? metric(summary, labels);
  return { ...input, sessions: pick(input.sessions, ["sessions?"]), messages: pick(input.messages, ["messages?"]), toolCalls: pick(input.toolCalls, ["tool calls?", "tool_calls?"]), inputTokens: pick(input.inputTokens, ["input tokens?", "input_tokens?"]), outputTokens: pick(input.outputTokens, ["output tokens?", "output_tokens?"]), totalTokens: pick(input.totalTokens, ["total tokens?", "tokens? total"]), totalCost: pick(input.totalCost, ["total cost", "cost total"]), peakHour: input.peakHour ?? peakMatch?.[1]?.trim() ?? null, byModel: input.byModel?.length ? input.byModel : parseModels(summary), activityPatterns: input.activityPatterns?.length ? input.activityPatterns : parseActivity(summary) };
}
export function formatCompact(value: number | null | undefined): string { if (value == null) return "—"; if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`; if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`; if (value >= 1e3) return `${(value / 1e3).toFixed(value >= 1e4 ? 0 : 1)}K`; return value.toLocaleString("en-US"); }
export function formatUsd(value: number): string { return `$${value.toLocaleString("en-US", { minimumFractionDigits: value < 100 ? 2 : 0, maximumFractionDigits: value < 100 ? 2 : 0 })}`; }
