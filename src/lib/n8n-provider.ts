import "server-only";

import { normalizeN8nExecution, normalizeN8nWorkflow, type NormalizedN8nExecution, type NormalizedN8nWorkflow } from "@/lib/n8n-normalize";

type N8nPage = { data?: unknown; nextCursor?: unknown };

export class N8nProviderError extends Error {
  constructor(public readonly code: "not_configured" | "unauthorized" | "invalid_response" | "provider_unavailable") {
    super(code);
    this.name = "N8nProviderError";
  }
}

export type N8nProviderSnapshot = {
  baseUrl: string;
  workflows: NormalizedN8nWorkflow[];
  executions: Map<string, NormalizedN8nExecution>;
};

function configuration(): { baseUrl: string; apiKey: string } {
  const rawBaseUrl = process.env.N8N_BASE_URL?.trim();
  const apiKey = process.env.N8N_API_KEY?.trim();
  if (!rawBaseUrl || !apiKey) throw new N8nProviderError("not_configured");
  try {
    const url = new URL(rawBaseUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) throw new Error();
    return { baseUrl: url.toString().replace(/\/$/, ""), apiKey };
  } catch {
    throw new N8nProviderError("not_configured");
  }
}

async function providerGet(baseUrl: string, apiKey: string, path: string, params: URLSearchParams): Promise<N8nPage> {
  const response = await fetch(`${baseUrl}/api/v1/${path}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json", "X-N8N-API-KEY": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => { throw new N8nProviderError("provider_unavailable"); });
  if (response.status === 401 || response.status === 403) throw new N8nProviderError("unauthorized");
  if (!response.ok) throw new N8nProviderError("provider_unavailable");
  const body = await response.json().catch(() => null);
  if (!body || typeof body !== "object" || !Array.isArray((body as N8nPage).data)) throw new N8nProviderError("invalid_response");
  return body as N8nPage;
}

async function allWorkflowRecords(baseUrl: string, apiKey: string): Promise<unknown[]> {
  const records: unknown[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({ limit: "250" });
    if (cursor) params.set("cursor", cursor);
    const body = await providerGet(baseUrl, apiKey, "workflows", params);
    records.push(...body.data as unknown[]);
    cursor = typeof body.nextCursor === "string" && body.nextCursor ? body.nextCursor : null;
    if (!cursor) return records;
  }
  throw new N8nProviderError("invalid_response");
}

async function latestExecution(baseUrl: string, apiKey: string, workflowId: string): Promise<NormalizedN8nExecution | null> {
  const params = new URLSearchParams({ workflowId, limit: "1", includeData: "false" });
  try {
    const body = await providerGet(baseUrl, apiKey, "executions", params);
    return normalizeN8nExecution((body.data as unknown[])[0]);
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await work(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function isN8nConfigured(): boolean {
  try { configuration(); return true; } catch { return false; }
}

export function n8nWorkflowUrl(baseUrl: string, workflowId: string): string {
  return `${baseUrl}/workflow/${encodeURIComponent(workflowId)}`;
}

export async function readN8nProviderSnapshot(): Promise<N8nProviderSnapshot> {
  const { baseUrl, apiKey } = configuration();
  const rawWorkflows = await allWorkflowRecords(baseUrl, apiKey);
  const workflows = rawWorkflows.map(normalizeN8nWorkflow).filter((item): item is NormalizedN8nWorkflow => item !== null);
  if (workflows.length !== rawWorkflows.length) throw new N8nProviderError("invalid_response");
  const latest = await mapWithConcurrency(workflows, 5, (workflow) => latestExecution(baseUrl, apiKey, workflow.externalWorkflowId));
  const executions = new Map(latest.filter((item): item is NormalizedN8nExecution => item !== null).map((item) => [item.workflowId, item]));
  return { baseUrl, workflows, executions };
}
