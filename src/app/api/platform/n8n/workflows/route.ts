import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isN8nConfigured } from "@/lib/n8n-provider";

export const dynamic = "force-dynamic";

const automationSelect = {
  id: true,
  provider: true,
  externalWorkflowId: true,
  workflowName: true,
  workflowUrl: true,
  providerActive: true,
  providerState: true,
  providerVersion: true,
  triggerSummary: true,
  integrationDependencies: true,
  lastExecutionStatus: true,
  lastExecutionAt: true,
  lastSyncedAt: true,
  businessId: true,
  nicheId: true,
  projectId: true,
  department: true,
  owningAgentId: true,
  purpose: true,
  approvalState: true,
  blueprintId: true,
  businessStages: true,
  governanceNotes: true,
  syncStatus: true,
  syncError: true,
} as const;

export async function GET() {
  try {
    const configured = isN8nConfigured();
    const automations = await prisma.automation.findMany({
      where: { provider: "n8n" },
      select: automationSelect,
      orderBy: [{ workflowName: "asc" }, { externalWorkflowId: "asc" }],
    });
    const lastSyncedAt = automations.reduce<Date | null>((latest, item) => !latest || item.lastSyncedAt > latest ? item.lastSyncedAt : latest, null);
    return NextResponse.json({
      automations,
      provider: {
        name: "N8N",
        hosting: "Self-hosted",
        configured,
        connected: configured && automations.some((item) => item.syncStatus === "synced"),
        lastSyncedAt,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      automations: [],
      provider: { name: "N8N", hosting: "Self-hosted", configured: isN8nConfigured(), connected: false, lastSyncedAt: null },
      error: "The automation registry is unavailable.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
