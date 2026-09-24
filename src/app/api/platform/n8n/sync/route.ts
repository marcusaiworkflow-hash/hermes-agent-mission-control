import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { n8nWorkflowUrl, readN8nProviderSnapshot } from "@/lib/n8n-provider";
import { sanitizeN8nError } from "@/lib/n8n-normalize";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const snapshot = await readN8nProviderSnapshot();
    const syncedAt = new Date();
    const operations = snapshot.workflows.map((workflow) => {
      const execution = snapshot.executions.get(workflow.externalWorkflowId);
      const providerData = {
        workflowName: workflow.workflowName,
        workflowUrl: n8nWorkflowUrl(snapshot.baseUrl, workflow.externalWorkflowId),
        providerActive: workflow.providerActive,
        providerState: workflow.providerState,
        providerVersion: workflow.providerVersion,
        triggerSummary: workflow.triggerSummary,
        integrationDependencies: workflow.integrationDependencies ?? Prisma.DbNull,
        lastExecutionStatus: execution?.status ?? null,
        lastExecutionAt: execution?.occurredAt ?? null,
        lastSyncedAt: syncedAt,
        syncStatus: "synced",
        syncError: null,
      };
      return prisma.automation.upsert({
        where: { provider_externalWorkflowId: { provider: "n8n", externalWorkflowId: workflow.externalWorkflowId } },
        create: { provider: "n8n", externalWorkflowId: workflow.externalWorkflowId, ...providerData },
        update: providerData,
        select: { id: true, externalWorkflowId: true, workflowName: true, providerState: true, lastSyncedAt: true },
      });
    });
    const automations = operations.length ? await prisma.$transaction(operations) : [];
    return NextResponse.json({ ok: true, synced: automations.length, lastSyncedAt: syncedAt, automations });
  } catch (error) {
    const sanitized = sanitizeN8nError(error);
    await prisma.automation.updateMany({
      where: { provider: "n8n" },
      data: { syncStatus: "error", syncError: sanitized.message },
    }).catch(() => undefined);
    const status = sanitized.code === "not_configured" ? 503 : sanitized.code === "unauthorized" ? 502 : 503;
    return NextResponse.json({ ok: false, error: sanitized.message, code: sanitized.code }, { status });
  }
}
