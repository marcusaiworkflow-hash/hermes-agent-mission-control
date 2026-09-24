import test from "node:test";
import assert from "node:assert/strict";
import { normalizeN8nExecution, normalizeN8nWorkflow, sanitizeN8nError } from "./n8n-normalize";

test("normalizes only allowlisted workflow metadata", () => {
  const result = normalizeN8nWorkflow({
    id: "provider-42", name: "Hermes MCP Proof - Day 14", active: false, isArchived: false, versionId: "version-7", secret: "must-not-leak",
    nodes: [
      { type: "n8n-nodes-base.manualTrigger", parameters: { token: "hidden" } },
      { type: "n8n-nodes-base.slack", credentials: { api: { id: "1", name: "secret-name" } } },
      { type: "n8n-nodes-base.set" },
    ],
  });
  assert.deepEqual(result, {
    externalWorkflowId: "provider-42", workflowName: "Hermes MCP Proof - Day 14", providerActive: false,
    providerState: "inactive", providerVersion: "version-7", triggerSummary: "Manual trigger", integrationDependencies: ["Slack"],
  });
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
  assert.equal(JSON.stringify(result).includes("secret-name"), false);
});

test("keeps unavailable workflow fields null and rejects invalid identity", () => {
  assert.deepEqual(normalizeN8nWorkflow({ id: "abc", name: "Minimal", nodes: [] }), {
    externalWorkflowId: "abc", workflowName: "Minimal", providerActive: null, providerState: "unknown",
    providerVersion: null, triggerSummary: null, integrationDependencies: null,
  });
  assert.equal(normalizeN8nWorkflow({ id: "abc", nodes: [] }), null);
});

test("normalizes execution status and safe timestamp without payload data", () => {
  const result = normalizeN8nExecution({ workflowId: "abc", status: "success", startedAt: "2026-09-22T12:00:00Z", data: { secret: true } });
  assert.equal(result?.status, "success");
  assert.equal(result?.occurredAt?.toISOString(), "2026-09-22T12:00:00.000Z");
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("provider errors are sanitized", () => {
  assert.deepEqual(sanitizeN8nError({ code: "unauthorized", message: "token abc at private.example" }), { code: "unauthorized", message: "N8N rejected the configured API credential." });
  assert.deepEqual(sanitizeN8nError(new Error("https://private.example?token=abc")), { code: "provider_unavailable", message: "N8N could not be reached for synchronization." });
});
