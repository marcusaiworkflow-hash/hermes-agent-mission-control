import { ArrowRight, CheckCircle2, Layers3, Link2Off, ShieldCheck } from "lucide-react";
import { Panel, Pill } from "@/components/ui/kit";

type Complexity = "LOW" | "MEDIUM" | "HIGH";
type Lifecycle = "TEMPLATE" | "PLANNED" | "DEPLOYED";
type Blueprint = {
  name: string;
  category: string;
  description: string;
  useCase: string;
  trigger: string;
  stages: string[];
  required: string[];
  optional: string[];
  approval: string;
  complexity: Complexity;
  lifecycle: Lifecycle;
  version: string;
};

const blueprints: Blueprint[] = [
  { name: "Lead Research & Qualification", category: "Lead Generation", description: "Turn a defined prospect profile into a reviewed, evidence-backed lead shortlist.", useCase: "Build qualified prospect lists without treating unreviewed enrichment as sales-ready truth.", trigger: "Approved research brief", stages: ["Define criteria", "Find leads", "Enrich", "AI qualification", "Human review"], required: ["Research source", "Structured output store"], optional: ["Google Sheets", "CRM"], approval: "Human approval before handoff", complexity: "MEDIUM", lifecycle: "TEMPLATE", version: "0.1" },
  { name: "Approved Outreach Sequence", category: "Sales / Outreach", description: "Prepare personalized outreach and route every send through a human approval gate.", useCase: "Convert an approved lead list into controlled, channel-ready outreach drafts.", trigger: "Approved qualified lead", stages: ["Load context", "Draft message", "Policy check", "Human approval", "Send / record"], required: ["Lead source", "Messaging provider"], optional: ["CRM", "Calendar"], approval: "Human approval required before send", complexity: "HIGH", lifecycle: "TEMPLATE", version: "0.1" },
  { name: "Client Onboarding Intake", category: "Client Onboarding", description: "Normalize approved intake information into a consistent onboarding workspace.", useCase: "Reduce manual setup while keeping client access and commitments reviewable.", trigger: "Approved client intake", stages: ["Validate intake", "Create workspace", "Prepare checklist", "Human review", "Notify team"], required: ["Intake source", "Workspace destination"], optional: ["Google Drive", "Telegram"], approval: "Human review before workspace activation", complexity: "MEDIUM", lifecycle: "TEMPLATE", version: "0.1" },
  { name: "Daily Intelligence Brief", category: "Research", description: "Collect selected sources and synthesize a concise, source-aware operator brief.", useCase: "Create a repeatable daily intelligence review without inventing unsupported conclusions.", trigger: "Scheduled daily window", stages: ["Collect sources", "Deduplicate", "Summarize", "Quality check", "Deliver brief"], required: ["Approved research sources"], optional: ["Telegram", "Email", "Notion"], approval: "Human review policy set before delivery", complexity: "LOW", lifecycle: "TEMPLATE", version: "0.1" },
];

const relationshipPaths = [
  {
    label: "Create from blueprint",
    note: "Shape a reusable pattern into a reviewed N8N workflow.",
    stages: ["Blueprint", "Customize", "Human Review", "Build in N8N", "Automation"],
  },
  {
    label: "Capture from proven work",
    note: "Generalize a proven workflow so the pattern can be reused.",
    stages: ["Automation", "Prove / Refine", "Generalize", "Save as Blueprint", "Reuse"],
  },
];

export default function N8nBlueprintsPage() {
  return <div className="relative z-10 w-full space-y-7 pb-16 pt-7">
    <header className="hq-rise" style={{ animationDelay: "0ms" }}>
      <div className="eyebrow mb-1.5">Reusable automation IP</div>
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[34px]">N8N Blueprints</h1><Pill tone="neutral">Read-only</Pill></div>
      <p className="mt-1 max-w-3xl text-[12.5px] text-[var(--text-2)]">Reusable business recipes Hermy HQ knows how to shape into governed automations.</p>
      <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-[var(--text-3)]">Blueprints are internal design assets, not deployed N8N workflows. This starter catalog contains no provider state, run history, or active connections.</p>
    </header>

    <section className="hq-rise" style={{ animationDelay: "45ms" }} aria-labelledby="blueprint-overview">
      <Panel className="overflow-hidden !border-[color-mix(in_srgb,var(--accent)_22%,var(--line))] !bg-[linear-gradient(120deg,color-mix(in_srgb,var(--accent)_8%,var(--surface-1)),var(--surface-1)_50%,color-mix(in_srgb,#8b5cf6_5%,var(--surface-1)))]">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><div className="flex items-center gap-2.5"><Layers3 className="h-4 w-4 text-[var(--accent)]" /><h2 id="blueprint-overview" className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text)]">Blueprint library</h2></div><p className="mt-3 text-[12.5px] leading-relaxed text-[var(--text-2)]">A small, curated foundation for future delivery. Every item remains a TEMPLATE until requirements, integrations, implementation, review, and activation are completed.</p></div><div className="grid min-w-[280px] grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--line)]"><Overview label="Starter templates" value={blueprints.length} /><Overview label="Deployed" value={0} /></div></div>
      </Panel>
    </section>

    <section className="hq-rise" style={{ animationDelay: "90ms" }} aria-labelledby="blueprint-automation-relationship">
      <div className="mb-3"><div className="eyebrow">Future architecture · inactive</div><h2 id="blueprint-automation-relationship" className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--text)]">Blueprints and Automations</h2><p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-[var(--text-3)]">Reusable patterns can become live N8N workflows, and proven workflows can be generalized into reusable blueprints.</p></div>
      <Panel className="overflow-hidden">
        <div className="divide-y divide-[var(--line)]">
          {relationshipPaths.map((path, pathIndex) => <div key={path.label} className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-center">
            <div><div className="eyebrow !text-[9px]">Path {pathIndex + 1}</div><h3 className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text)]">{path.label}</h3><p className="mt-2 text-[10.5px] leading-relaxed text-[var(--text-3)]">{path.note}</p></div>
            <div className="flex flex-col gap-2 min-[1400px]:flex-row min-[1400px]:items-center">{path.stages.map((stage, stageIndex) => <div key={stage} className="contents"><div className={`flex min-h-12 flex-1 items-center rounded-[10px] border px-3 py-2.5 ${stage.toLowerCase().includes("human review") ? "border-[color-mix(in_srgb,var(--warn)_24%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_5%,var(--surface-2))]" : "border-[var(--line)] bg-[var(--surface-2)]"}`}><span className="num mr-2 text-[9px] text-[var(--text-4)]">{stageIndex + 1}</span><span className="text-[10.5px] font-medium leading-snug text-[var(--text-2)]">{stage}</span></div>{stageIndex < path.stages.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 self-center rotate-90 text-[var(--text-4)] min-[1400px]:rotate-0" />}</div>)}</div>
          </div>)}
        </div>
        <div className="flex items-start gap-2 border-t border-[var(--line)] px-5 py-3 text-[10.5px] leading-relaxed text-[var(--text-3)]"><Link2Off className="mt-0.5 h-3.5 w-3.5 shrink-0" />Both paths are explanatory only in Phase A. Neither builds, activates, or synchronizes an N8N workflow automatically; human review remains required before any future implementation becomes operational.</div>
      </Panel>
    </section>

    <section className="hq-rise" style={{ animationDelay: "135ms" }} aria-labelledby="blueprint-catalog">
      <div className="mb-3 flex items-end justify-between gap-4"><div><div className="eyebrow">Curated starter set</div><h2 id="blueprint-catalog" className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--text)]">Reusable recipes</h2></div><span className="num text-[10.5px] text-[var(--text-3)]">{blueprints.length} templates · 0 deployed</span></div>
      <div className="grid gap-4 xl:max-w-[1216px] xl:grid-cols-2">{blueprints.map((blueprint, index) => <BlueprintCard key={blueprint.name} blueprint={blueprint} index={index} />)}</div>
    </section>
  </div>;
}

function Overview({ label, value }: { label: string; value: number }) {
  return <div className="bg-[var(--surface-2)] p-4"><div className="eyebrow !text-[9px]">{label}</div><div className="num mt-2 text-[25px] font-semibold text-[var(--text)]">{value}</div></div>;
}

function BlueprintCard({ blueprint, index }: { blueprint: Blueprint; index: number }) {
  return <article className="panel min-w-0 overflow-hidden">
    <div className="p-5 sm:px-6 sm:py-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_23%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] text-[10px] font-semibold text-[var(--accent)]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="text-[15px] font-semibold text-[var(--text)]">{blueprint.name}</h3><p className="mt-1 text-[10.5px] text-[var(--text-4)]">{blueprint.category} · v{blueprint.version}</p></div></div><div className="flex flex-wrap justify-end gap-1.5"><Pill tone="accent" className="!px-2 !py-0.5 !text-[9px]">{blueprint.lifecycle}</Pill><Pill tone="neutral" className="!px-2 !py-0.5 !text-[9px]">{blueprint.complexity}</Pill></div></div><p className="mt-4 text-[12.5px] leading-relaxed text-[var(--text-2)]">{blueprint.description}</p><div className="mt-4 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] p-3"><div className="eyebrow !text-[9px]">Use case</div><p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--text-2)]">{blueprint.useCase}</p></div>
      <div className="mt-4"><div className="eyebrow !text-[9px]">Business stages</div><div className="mt-2 flex flex-wrap items-center gap-1.5">{blueprint.stages.map((stage, stageIndex) => <div key={stage} className="contents"><span className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 text-[10px] text-[var(--text-2)]">{stage}</span>{stageIndex < blueprint.stages.length - 1 && <ArrowRight className="h-3 w-3 text-[var(--text-4)]" />}</div>)}</div></div>
    </div>
    <div className="grid gap-x-5 gap-y-3.5 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-2)_38%,transparent)] px-5 py-3.5 text-[10.5px] sm:grid-cols-2 sm:px-6"><Field label="Trigger" value={blueprint.trigger} /><Field label="Approval gate" value={blueprint.approval} icon={<CheckCircle2 className="h-3 w-3 text-[var(--warn)]" />} /><Field label="Required integrations" value={blueprint.required.join(" · ")} /><Field label="Optional integrations" value={blueprint.optional.join(" · ")} /><Field label="Linked automation" value="None — template only" icon={<Link2Off className="h-3 w-3 text-[var(--text-4)]" />} /><Field label="Provenance" value="Hermy HQ Phase A starter catalog" icon={<ShieldCheck className="h-3 w-3 text-[var(--accent)]" />} /></div>
  </article>;
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="min-w-0"><div className="text-[var(--text-4)]">{label}</div><div className="mt-1 flex items-start gap-1.5 leading-relaxed text-[var(--text-2)]">{icon}{value}</div></div>;
}
