"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ExternalLink, GitBranch, LockKeyhole, Network, RefreshCcw, Workflow } from "lucide-react";
import { EmptyState, Panel, Pill } from "@/components/ui/kit";

type Automation = {
  id: string; externalWorkflowId: string; workflowName: string; workflowUrl: string | null;
  providerActive: boolean | null; providerState: string; providerVersion: string | null;
  triggerSummary: string | null; integrationDependencies: unknown; lastExecutionStatus: string | null;
  lastExecutionAt: string | null; lastSyncedAt: string; businessId: string | null; nicheId: string | null;
  projectId: string | null; department: string | null; owningAgentId: string | null; purpose: string | null;
  approvalState: string; blueprintId: string | null; businessStages: unknown; governanceNotes: string | null;
  syncStatus: string; syncError: string | null;
};

type RegistryResponse = {
  automations: Automation[];
  provider: { name: string; hosting: string; configured: boolean; connected: boolean; lastSyncedAt: string | null };
  error?: string;
};

const EMPTY: RegistryResponse = { automations: [], provider: { name: "N8N", hosting: "Self-hosted", configured: false, connected: false, lastSyncedAt: null } };

function display(value: string | null | undefined): string { return value?.trim() || "Not assigned"; }
function dateTime(value: string | null): string {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unavailable" : parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
function stringList(value: unknown): string {
  return Array.isArray(value) && value.every((item) => typeof item === "string") && value.length ? value.join(" · ") : "Unavailable";
}
function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.toString() : null; }
  catch { return null; }
}

export default function N8nAutomationsPage() {
  const [registry, setRegistry] = useState<RegistryResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/platform/n8n/workflows", { cache: "no-store" });
      const body = await response.json() as RegistryResponse;
      setRegistry(body);
      if (!response.ok) setNotice(body.error ?? "The automation registry is unavailable.");
    } catch { setNotice("The automation registry is unavailable."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function synchronize() {
    setSyncing(true); setNotice(null);
    try {
      const response = await fetch("/api/platform/n8n/sync", { method: "POST" });
      const body = await response.json() as { synced?: number; error?: string };
      if (!response.ok) throw new Error(body.error ?? "N8N synchronization failed.");
      setNotice(`${body.synced ?? 0} workflow${body.synced === 1 ? "" : "s"} synchronized from N8N.`);
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "N8N synchronization failed."); }
    finally { setSyncing(false); }
  }

  const connectionLabel = registry.provider.connected ? "Connected" : registry.provider.configured ? "Configured · sync required" : "Configuration unavailable";
  const connectionTone = registry.provider.connected ? "up" : registry.provider.configured ? "warn" : "neutral";

  return <div className="relative z-10 w-full space-y-6 pb-16 pt-7">
    <header className="hq-rise" style={{ animationDelay: "0ms" }}>
      <div className="eyebrow mb-1.5">Automation operations</div>
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[34px]">N8N Automations</h1><Pill tone="neutral">Read + sync</Pill></div>
      <p className="mt-1 max-w-3xl text-[12.5px] text-[var(--text-2)]">Real provider workflows mirrored into Hermy HQ for visibility and governance. Activation and execution remain in N8N.</p>
    </header>

    <section className="hq-rise" style={{ animationDelay: "45ms" }} aria-labelledby="provider-state">
      <Panel className="overflow-hidden !border-[color-mix(in_srgb,var(--accent)_22%,var(--line))] !bg-[linear-gradient(120deg,color-mix(in_srgb,var(--accent)_7%,var(--surface-1)),var(--surface-1)_60%)]">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-3xl items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_24%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"><Network className="h-5 w-5 text-[var(--accent)]" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 id="provider-state" className="text-[18px] font-semibold text-[var(--text)]">Self-hosted N8N provider</h2><Pill tone={connectionTone}>{connectionLabel.toUpperCase()}</Pill></div><p className="mt-2 text-[12.5px] leading-relaxed text-[var(--text-2)]">Manual synchronization reads workflow identity and safe runtime metadata. It cannot execute, activate, publish, archive, delete, or modify credentials.</p></div></div>
          <button type="button" onClick={synchronize} disabled={syncing || !registry.provider.configured} className="btn-ghost inline-flex shrink-0 items-center justify-center gap-2 px-4 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"><RefreshCcw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Synchronizing…" : "Sync from N8N"}</button>
        </div>
        <div className="grid border-t border-[var(--line)] sm:grid-cols-3"><State label="Provider connection" value={connectionLabel} icon={<Network className="h-3.5 w-3.5" />} /><State label="Registry records" value={loading ? "Loading…" : String(registry.automations.length)} icon={<Workflow className="h-3.5 w-3.5" />} border /><State label="Last synchronized" value={dateTime(registry.provider.lastSyncedAt)} icon={<RefreshCcw className="h-3.5 w-3.5" />} border /></div>
        {notice && <div role="status" className="border-t border-[var(--line)] px-5 py-3 text-[11px] text-[var(--text-3)]">{notice}</div>}
      </Panel>
    </section>

    <section className="hq-rise" style={{ animationDelay: "90ms" }} aria-labelledby="automation-registry">
      <div className="mb-3 flex items-end justify-between gap-4"><div><div className="eyebrow">Provider-backed registry</div><h2 id="automation-registry" className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--text)]">Automations</h2></div><span className="num text-[10px] text-[var(--text-4)]">N8N source · Hermy HQ context</span></div>
      {loading ? <Panel><EmptyState icon={<RefreshCcw className="h-6 w-6 animate-spin" />} title="Loading automation registry" /></Panel> : registry.automations.length === 0 ? <Panel><EmptyState icon={<Workflow className="h-7 w-7" />} title="No synchronized workflows" hint={registry.provider.configured ? "Run a manual sync to discover provider workflows. No starter workflows are fabricated here." : "Add the server-only N8N configuration and create the Automation table before the first manual sync."} /></Panel> : <div className="space-y-4">{registry.automations.map((automation) => <AutomationCard key={automation.id} automation={automation} />)}</div>}
    </section>

    <section className="hq-rise" style={{ animationDelay: "135ms" }}>
      <Panel className="flex items-start gap-3 p-5"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" /><div><h2 className="text-[13px] font-semibold text-[var(--text)]">Governance boundary</h2><p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--text-3)]">Hermy HQ approval and N8N activation are separate states. Approval never activates a workflow; this page exposes no provider mutation controls.</p></div></Panel>
    </section>
  </div>;
}

function AutomationCard({ automation }: { automation: Automation }) {
  const stateTone = automation.providerActive === true ? "up" : automation.providerActive === false ? "neutral" : "warn";
  const workflowUrl = safeExternalUrl(automation.workflowUrl);
  return <article className="panel min-w-0 overflow-hidden">
    <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[16px] font-semibold text-[var(--text)]">{automation.workflowName}</h3><Pill tone={stateTone}>{automation.providerState.toUpperCase()}</Pill><Pill tone="accent">HQ {automation.approvalState.toUpperCase()}</Pill></div><p className="num mt-2 break-all text-[10px] text-[var(--text-4)]">External ID · {automation.externalWorkflowId}</p></div>{workflowUrl ? <a href={workflowUrl} target="_blank" rel="noreferrer" className="btn-ghost inline-flex shrink-0 items-center justify-center gap-2 px-3 py-2 text-[11.5px]"><ExternalLink className="h-3.5 w-3.5" />Open in N8N</a> : <span className="text-[10.5px] text-[var(--text-4)]">Provider link unavailable</span>}</div>
    <div className="grid border-t border-[var(--line)] xl:grid-cols-2">
      <div className="p-5 sm:p-6 xl:border-r xl:border-[var(--line)]"><div className="flex items-center gap-2"><Network className="h-3.5 w-3.5 text-[var(--accent)]" /><h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text)]">Provider state</h4></div><div className="mt-4 grid gap-x-5 gap-y-3.5 sm:grid-cols-2"><Field label="Activation" value={automation.providerActive === null ? "Unavailable" : automation.providerActive ? "Active" : "Inactive"} /><Field label="Provider version" value={automation.providerVersion ?? "Unavailable"} /><Field label="Trigger" value={automation.triggerSummary ?? "Unavailable"} /><Field label="Integrations" value={stringList(automation.integrationDependencies)} /><Field label="Last execution" value={automation.lastExecutionStatus ?? "Unavailable"} /><Field label="Execution time" value={dateTime(automation.lastExecutionAt)} /><Field label="Last synchronized" value={dateTime(automation.lastSyncedAt)} /><Field label="Sync status" value={automation.syncStatus} /></div></div>
      <div className="p-5 sm:p-6"><div className="flex items-center gap-2"><GitBranch className="h-3.5 w-3.5 text-[var(--accent)]" /><h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text)]">Hermy HQ context</h4></div><div className="mt-4 grid gap-x-5 gap-y-3.5 sm:grid-cols-2"><Field label="Business" value={display(automation.businessId)} /><Field label="Niche" value={display(automation.nicheId)} /><Field label="Project" value={display(automation.projectId)} /><Field label="Department" value={display(automation.department)} /><Field label="Owning agent" value={display(automation.owningAgentId)} /><Field label="Approval" value={automation.approvalState} /><Field label="Blueprint" value={display(automation.blueprintId)} /><Field label="Business stages" value={stringList(automation.businessStages)} /><div className="sm:col-span-2"><Field label="Purpose" value={display(automation.purpose)} /></div><div className="sm:col-span-2"><Field label="Governance notes" value={display(automation.governanceNotes)} /></div></div></div>
    </div>
    {automation.syncError && <div className="border-t border-[var(--line)] px-5 py-3 text-[10.5px] text-[var(--warn)]">Last sync issue: {automation.syncError}</div>}
  </article>;
}

function State({ label, value, icon, border = false }: { label: string; value: string; icon: ReactNode; border?: boolean }) {
  return <div className={`flex items-center gap-3 px-5 py-4 ${border ? "border-t border-[var(--line)] sm:border-l sm:border-t-0" : ""}`}><span className="text-[var(--text-4)]">{icon}</span><div><div className="text-[9.5px] uppercase tracking-[0.12em] text-[var(--text-4)]">{label}</div><div className="mt-1 text-[11.5px] text-[var(--text-2)]">{value}</div></div></div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border-t border-[var(--line)] pt-2.5"><div className="text-[9.5px] text-[var(--text-4)]">{label}</div><div className="mt-1 break-words text-[11px] capitalize leading-relaxed text-[var(--text-2)]">{value}</div></div>;
}
