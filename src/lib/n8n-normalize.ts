export type NormalizedN8nWorkflow = {
  externalWorkflowId: string;
  workflowName: string;
  providerActive: boolean | null;
  providerState: "active" | "inactive" | "archived" | "unknown";
  providerVersion: string | null;
  triggerSummary: string | null;
  integrationDependencies: string[] | null;
};

export type NormalizedN8nExecution = {
  workflowId: string;
  status: string | null;
  occurredAt: Date | null;
};

type UnknownRecord = Record<string, unknown>;

const INTERNAL_NODE_NAMES = new Set([
  "aggregate", "code", "compareDatasets", "dateTime", "debugHelper", "editFields",
  "filter", "function", "functionItem", "html", "httpRequest", "if", "itemLists", "limit", "loopOverItems",
  "manualTrigger", "merge", "noOp", "respondToWebhook", "set", "splitInBatches", "stickyNote",
  "stopAndError", "summarize", "switch", "wait", "webhook",
]);

const TRIGGER_LABELS: Record<string, string> = {
  chatTrigger: "Chat trigger",
  emailReadImap: "Email trigger (IMAP)",
  errorTrigger: "Error trigger",
  formTrigger: "Form trigger",
  manualTrigger: "Manual trigger",
  scheduleTrigger: "Schedule trigger",
  webhook: "Webhook trigger",
  workflowTrigger: "Workflow trigger",
};

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nodeKey(type: string): string {
  return type.split(".").at(-1) ?? type;
}

function words(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function triggerLabel(type: string): string | null {
  const key = nodeKey(type);
  if (TRIGGER_LABELS[key]) return TRIGGER_LABELS[key];
  if (/trigger$/i.test(key)) return `${words(key.replace(/trigger$/i, "")).trim()} trigger`;
  return null;
}

function dependencyLabel(type: string): string | null {
  const key = nodeKey(type);
  if (INTERNAL_NODE_NAMES.has(key) || /trigger$/i.test(key)) return null;
  if (type.startsWith("n8n-nodes-base.")) return words(key);
  if (type.startsWith("@n8n/n8n-nodes-langchain.")) return words(key.replace(/^lmChat/i, "").replace(/^tool/i, ""));
  if (type.includes(".")) return words(key);
  return null;
}

export function normalizeN8nWorkflow(value: unknown): NormalizedN8nWorkflow | null {
  const workflow = asRecord(value);
  const externalWorkflowId = asNonEmptyString(workflow?.id);
  const workflowName = asNonEmptyString(workflow?.name);
  if (!workflow || !externalWorkflowId || !workflowName) return null;
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const triggers = new Set<string>();
  const dependencies = new Set<string>();
  for (const candidate of nodes) {
    const node = asRecord(candidate);
    const type = asNonEmptyString(node?.type);
    if (!type) continue;
    const trigger = triggerLabel(type);
    if (trigger) triggers.add(trigger);
    const dependency = dependencyLabel(type);
    if (dependency) dependencies.add(dependency);
  }
  const active = typeof workflow.active === "boolean" ? workflow.active : null;
  const archived = workflow.isArchived === true;
  const providerState = archived ? "archived" : active === true ? "active" : active === false ? "inactive" : "unknown";
  return {
    externalWorkflowId,
    workflowName,
    providerActive: active,
    providerState,
    providerVersion: asNonEmptyString(workflow.versionId),
    triggerSummary: triggers.size ? [...triggers].sort().join(" · ") : null,
    integrationDependencies: dependencies.size ? [...dependencies].sort() : null,
  };
}

export function normalizeN8nExecution(value: unknown): NormalizedN8nExecution | null {
  const execution = asRecord(value);
  const workflowId = asNonEmptyString(execution?.workflowId);
  if (!execution || !workflowId) return null;
  const status = asNonEmptyString(execution.status);
  const timestamp = asNonEmptyString(execution.stoppedAt) ?? asNonEmptyString(execution.startedAt);
  const parsed = timestamp ? new Date(timestamp) : null;
  return { workflowId, status, occurredAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed : null };
}

export function sanitizeN8nError(error: unknown): { code: string; message: string } {
  const record = asRecord(error);
  const code = asNonEmptyString(record?.code);
  if (code === "not_configured") return { code, message: "N8N provider configuration is unavailable." };
  if (code === "unauthorized") return { code, message: "N8N rejected the configured API credential." };
  if (code === "invalid_response") return { code, message: "N8N returned an unsupported response." };
  return { code: code ?? "provider_unavailable", message: "N8N could not be reached for synchronization." };
}
