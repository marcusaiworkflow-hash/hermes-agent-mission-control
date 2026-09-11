import { ArrowRight, CircleOff, ExternalLink, GitBranch, LockKeyhole, Network, RefreshCcw, Workflow } from "lucide-react";
import { Panel, Pill } from "@/components/ui/kit";

const stages = ["Trigger", "Find Leads", "Enrich", "AI Qualification", "Human Approval", "Outreach / CRM"];
const fields = ["Workflow name", "Description / purpose", "Department", "Owner / agent", "Business", "Niche", "Project", "Trigger", "Status", "Version", "Approval gates", "Connected systems", "Business-stage diagram", "External N8N reference", "Last sync", "Last run", "Provenance"];

export default function N8nAutomationsPage() {
  return <div className="relative z-10 w-full space-y-6 pb-16 pt-7">
    <header className="hq-rise" style={{ animationDelay: "0ms" }}>
      <div className="eyebrow mb-1.5">Automation operations</div>
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[34px]">N8N Automations</h1><Pill tone="neutral">Read-only</Pill></div>
      <p className="mt-1 max-w-3xl text-[12.5px] text-[var(--text-2)]">Deployed workflows running real operations across Hermy HQ.</p>
    </header>

    <section className="hq-rise" style={{ animationDelay: "45ms" }} aria-labelledby="provider-state">
      <Panel className="overflow-hidden !border-[color-mix(in_srgb,var(--warn)_20%,var(--line))] !bg-[linear-gradient(120deg,color-mix(in_srgb,var(--warn)_5%,var(--surface-1)),var(--surface-1)_60%)]">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-3xl items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[color-mix(in_srgb,var(--warn)_22%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)]"><CircleOff className="h-5 w-5 text-[var(--warn)]" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 id="provider-state" className="text-[18px] font-semibold text-[var(--text)]">Automation engine not connected</h2><Pill tone="warn">NOT SYNCED</Pill></div><p className="mt-2 text-[12.5px] leading-relaxed text-[var(--text-2)]">No N8N installation, API connection, or deployed automation metadata source is configured. No deployed automations are available yet. Real workflows will appear here after provider synchronization is configured.</p></div></div>
          <button type="button" disabled aria-disabled="true" title="Available after a real N8N workflow reference is synchronized" className="btn-ghost inline-flex shrink-0 cursor-not-allowed items-center justify-center gap-2 px-4 py-2 text-[12px] opacity-40"><ExternalLink className="h-3.5 w-3.5" />Open in N8N</button>
        </div>
        <div className="grid border-t border-[var(--line)] sm:grid-cols-3"><State label="Provider connection" value="Not configured" icon={<Network className="h-3.5 w-3.5" />} /><State label="Deployed records" value="Unavailable" icon={<Workflow className="h-3.5 w-3.5" />} border /><State label="Synchronization" value="Not configured" icon={<RefreshCcw className="h-3.5 w-3.5" />} border /></div>
      </Panel>
    </section>

    <section className="hq-rise grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]" style={{ animationDelay: "90ms" }}>
      <Panel className="overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4"><div className="eyebrow">Deployed workflow registry</div><div className="mt-1.5 flex items-center justify-between gap-3"><h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--text)]">Automations</h2><span className="num text-[10px] text-[var(--text-4)]">Provider-backed records only</span></div></div>
        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"><Workflow className="h-7 w-7 text-[var(--text-3)]" /><p className="mt-4 text-[14px] font-medium text-[var(--text-2)]">No deployed automations available</p><p className="mt-1 max-w-md text-[12px] leading-relaxed text-[var(--text-3)]">This registry intentionally remains empty until a real N8N source can confirm workflow identity, state, version, and synchronization timestamps.</p></div>
      </Panel>
      <Panel className="p-5"><div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-[var(--accent)]" /><h2 className="text-[14px] font-semibold text-[var(--text)]">Record architecture</h2></div><p className="mt-2 text-[11.5px] leading-relaxed text-[var(--text-3)]">Each future row is reserved for synchronized facts. Unavailable fields stay unavailable rather than inferred.</p><div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">{fields.map((field) => <div key={field} className="border-t border-[var(--line)] pt-2.5 text-[10.5px] text-[var(--text-2)]">{field}</div>)}</div><div className="mt-5 flex items-start gap-2 rounded-lg border border-dashed border-[var(--line-strong)] p-3 text-[10.5px] leading-relaxed text-[var(--text-3)]"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Future status vocabulary: ACTIVE · INACTIVE · ERROR only when provider-confirmed · UNKNOWN · NOT SYNCED. Until synchronization exists, the registry remains NOT SYNCED.</span></div></Panel>
    </section>

    <section className="hq-rise" style={{ animationDelay: "135ms" }} aria-labelledby="concept-flow">
      <div className="mb-3"><div className="eyebrow">Conceptual reference · not deployed</div><h2 id="concept-flow" className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--text)]">Future business-stage view</h2><p className="mt-1 text-[12px] text-[var(--text-3)]">An explanatory example of how a synchronized workflow could be translated into Hermy HQ stages.</p></div>
      <Panel className="p-5 sm:p-6"><div className="flex flex-col gap-2 lg:flex-row lg:items-center">{stages.map((stage, index) => <div key={stage} className="contents"><div className={`flex min-h-16 flex-1 items-center rounded-[10px] border px-4 py-3 ${stage === "Human Approval" ? "border-[color-mix(in_srgb,var(--warn)_28%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_6%,var(--surface-2))]" : "border-[var(--line)] bg-[var(--surface-2)]"}`}><span className="num mr-2 text-[9px] text-[var(--text-4)]">{String(index + 1).padStart(2, "0")}</span><span className="text-[11.5px] font-medium text-[var(--text-2)]">{stage}</span></div>{index < stages.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 self-center rotate-90 text-[var(--text-4)] lg:rotate-0" />}</div>)}</div></Panel>
    </section>
  </div>;
}

function State({ label, value, icon, border = false }: { label: string; value: string; icon: React.ReactNode; border?: boolean }) {
  return <div className={`flex items-center gap-3 px-5 py-4 ${border ? "border-t border-[var(--line)] sm:border-l sm:border-t-0" : ""}`}><span className="text-[var(--text-4)]">{icon}</span><div><div className="text-[9.5px] uppercase tracking-[0.12em] text-[var(--text-4)]">{label}</div><div className="mt-1 text-[11.5px] text-[var(--text-2)]">{value}</div></div></div>;
}
