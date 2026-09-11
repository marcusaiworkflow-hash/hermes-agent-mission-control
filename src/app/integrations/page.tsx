"use client";

import { useMemo, useState } from "react";
import {
  Blocks,
  Bot,
  Box,
  CalendarDays,
  Database,
  FileSpreadsheet,
  Github,
  HardDrive,
  Mail,
  Network,
  NotebookText,
  Search,
  Send,
  ServerCog,
  type LucideIcon,
} from "lucide-react";
import { EmptyState, Panel, Pill, rise } from "@/components/ui/kit";

type Status = "CONNECTED" | "AVAILABLE" | "NEEDS ATTENTION" | "NOT CONFIGURED" | "UNVERIFIED" | "UNAVAILABLE";
type Category = "Operator application" | "Infrastructure";
type Integration = {
  name: string;
  provider: string;
  purpose: string;
  category: Category;
  status: Status;
  method: string;
  capabilities: string[];
  dependency?: string;
  accountIdentity?: string;
  lastVerified?: string;
  provenance: string;
  icon: LucideIcon;
};

const integrations: Integration[] = [
  { name: "Gmail", provider: "Google", purpose: "Email communication and operator workflows.", category: "Operator application", status: "AVAILABLE", method: "Provider connection required", capabilities: ["Read and organize mail", "Draft and send with approval"], dependency: "Composio or direct provider integration", provenance: "Phase A curated catalog", icon: Mail },
  { name: "Google Calendar", provider: "Google", purpose: "Calendars, events, and scheduling context.", category: "Operator application", status: "AVAILABLE", method: "Provider connection required", capabilities: ["Read calendars", "Create events with approval"], dependency: "Composio or direct provider integration", provenance: "Phase A curated catalog", icon: CalendarDays },
  { name: "Google Drive", provider: "Google", purpose: "Files and shared workspace documents.", category: "Operator application", status: "AVAILABLE", method: "Provider connection required", capabilities: ["Find files", "Read authorized documents"], dependency: "Composio or direct provider integration", provenance: "Phase A curated catalog", icon: HardDrive },
  { name: "Google Sheets", provider: "Google", purpose: "Structured operating data in spreadsheets.", category: "Operator application", status: "AVAILABLE", method: "Provider connection required", capabilities: ["Read authorized sheets", "Update rows with approval"], dependency: "Composio or direct provider integration", provenance: "Phase A curated catalog", icon: FileSpreadsheet },
  { name: "Notion", provider: "Notion", purpose: "Knowledge, project notes, and operating documents.", category: "Operator application", status: "AVAILABLE", method: "Provider connection required", capabilities: ["Search authorized pages", "Create and update content"], dependency: "Composio or direct provider integration", provenance: "Phase A curated catalog", icon: NotebookText },
  { name: "GitHub", provider: "GitHub", purpose: "Source code, issues, and reviewed development workflows.", category: "Operator application", status: "AVAILABLE", method: "Provider connection required", capabilities: ["Inspect repositories", "Support reviewed code workflows"], provenance: "Phase A curated catalog", icon: Github },
  { name: "Telegram", provider: "Telegram", purpose: "Operator messaging and future automation delivery.", category: "Operator application", status: "AVAILABLE", method: "Bot or provider connection required", capabilities: ["Receive messages", "Deliver approved notifications"], provenance: "Phase A curated catalog", icon: Send },
  { name: "Hermes Bridge", provider: "Hermy HQ", purpose: "Transports work and operational snapshots between Hermy HQ and Hermes.", category: "Infrastructure", status: "CONNECTED", method: "Existing Bridge service", capabilities: ["Request transport", "Operational snapshot mirroring"], dependency: "Supabase Postgres and Hermes runtime", provenance: "Existing Hermy HQ architecture", icon: ServerCog },
  { name: "Supabase", provider: "Supabase", purpose: "Shared Postgres persistence and coordination for Mission Control.", category: "Infrastructure", status: "CONNECTED", method: "Existing application integration", capabilities: ["Operational persistence", "Bridge coordination"], provenance: "Existing Hermy HQ architecture", icon: Database },
  { name: "N8N", provider: "N8N", purpose: "Future workflow automation engine for governed operations.", category: "Infrastructure", status: "NOT CONFIGURED", method: "No provider connection", capabilities: ["Workflow orchestration", "Provider-backed run synchronization"], provenance: "Phase A configuration baseline", icon: Network },
  { name: "Composio", provider: "Composio", purpose: "Future connection layer for external applications and tools.", category: "Infrastructure", status: "NOT CONFIGURED", method: "No provider connection", capabilities: ["External account connections", "Tool authorization"], provenance: "Phase A configuration baseline", icon: Blocks },
];

type Tab = "All" | "Connected" | "Available";
const tabs: Tab[] = ["All", "Connected", "Available"];
const inputClass = "rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[12px] text-[var(--text-2)] outline-none";

export default function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [method, setMethod] = useState("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return integrations.filter((item) => {
      if (tab === "Connected" && item.status !== "CONNECTED") return false;
      if (tab === "Available" && item.status !== "AVAILABLE") return false;
      if (category !== "all" && item.category !== category) return false;
      if (method === "existing" && !item.method.startsWith("Existing")) return false;
      if (method === "required" && item.method.startsWith("Existing")) return false;
      return !needle || [item.name, item.provider, item.purpose, item.category, item.method, ...item.capabilities].some((value) => value.toLowerCase().includes(needle));
    });
  }, [category, method, query, tab]);

  return <div className="relative z-10 w-full space-y-6 pb-16 pt-7">
    <header className="hq-rise" style={rise(0)}>
      <div className="eyebrow mb-1.5">Platform capability inventory</div>
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[34px]">Integrations</h1><Pill tone="neutral">Read-only</Pill></div>
      <p className="mt-1 max-w-3xl text-[12.5px] text-[var(--text-2)]">Connected systems, infrastructure, and external capabilities available to Hermy HQ.</p>
    </header>

    <section className="hq-rise" style={rise(1)} aria-labelledby="access-overview">
      <Panel className="overflow-hidden !border-[color-mix(in_srgb,var(--accent)_22%,var(--line))] !bg-[linear-gradient(120deg,color-mix(in_srgb,var(--accent)_8%,var(--surface-1)),var(--surface-1)_50%,color-mix(in_srgb,#8b5cf6_5%,var(--surface-1)))]">
        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="border-b border-[var(--line)] p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2.5"><Box className="h-4 w-4 text-[var(--accent)]" /><h2 id="access-overview" className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text)]">Access overview</h2></div>
            <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--text-2)]">The catalog separates proven platform infrastructure from applications that could be connected later. Available means cataloged capability—not an authorized account or active connection.</p>
          </div>
          <div className="grid grid-cols-3">
            <Summary label="Cataloged" value={integrations.length} note="Curated systems" />
            <Summary label="Connected" value={integrations.filter((item) => item.status === "CONNECTED").length} note="Architecture-backed" border />
            <Summary label="Not configured" value={integrations.filter((item) => item.status === "NOT CONFIGURED").length} note="No provider link" border />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--line)] px-5 py-3 text-[10.5px] text-[var(--text-3)]"><span className="font-medium text-[var(--text-2)]">Responsibility model</span><span>Hermy HQ governs</span><span>·</span><span>Hermes thinks</span><span>·</span><span>Bridge transports</span><span>·</span><span>Composio connects</span><span>·</span><span>N8N automates</span><span>·</span><span>Supabase remembers</span></div>
      </Panel>
    </section>

    <section className="hq-rise" style={rise(2)} aria-label="Integration filters">
      <Panel className="p-3 sm:p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-1">{tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} aria-pressed={tab === item} className={`flex-1 rounded-md px-3 py-1.5 text-[11.5px] transition-colors ${tab === item ? "bg-[var(--surface-3)] text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]"}`}>{item}</button>)}</div>
        <label className="relative min-w-0 flex-1"><span className="sr-only">Search integrations</span><Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-4)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search integrations..." className={`${inputClass} w-full pl-9`} /></label>
        <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}><option value="all">All categories</option><option value="Operator application">Operator applications</option><option value="Infrastructure">Infrastructure</option></select>
        <select aria-label="Filter by connection method" value={method} onChange={(event) => setMethod(event.target.value)} className={inputClass}><option value="all">All connection methods</option><option value="existing">Existing integration</option><option value="required">Connection required</option></select>
      </div></Panel>
    </section>

    <section className="hq-rise" style={rise(3)} aria-labelledby="integration-catalog">
      <div className="mb-3 flex items-end justify-between gap-4"><div><div className="eyebrow">Capability registry</div><h2 id="integration-catalog" className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--text)]">Systems and applications</h2></div><span className="num text-[10.5px] text-[var(--text-3)]">{filtered.length} shown · {integrations.length} cataloged</span></div>
      {!filtered.length ? <Panel><EmptyState icon={<Search className="h-6 w-6" />} title="No integrations match this view" hint="Change the tab, search, or filters to widen the catalog result." /></Panel> : <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),400px))] gap-3">{filtered.map((item) => <IntegrationCard key={item.name} item={item} />)}</div>}
    </section>
  </div>;
}

function Summary({ label, value, note, border = false }: { label: string; value: number; note: string; border?: boolean }) {
  return <div className={`p-4 sm:p-5 ${border ? "border-l border-[var(--line)]" : ""}`}><div className="eyebrow !text-[9px]">{label}</div><div className="num mt-2 text-[25px] font-semibold text-[var(--text)]">{value}</div><div className="mt-1 text-[9.5px] text-[var(--text-4)]">{note}</div></div>;
}

function IntegrationCard({ item }: { item: Integration }) {
  const Icon = item.icon;
  const tone = item.status === "CONNECTED" ? "up" : item.status === "NOT CONFIGURED" ? "neutral" : "accent";
  return <article className="panel min-w-0 overflow-hidden">
    <div className="flex items-start gap-4 p-4 sm:p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)]"><Icon className="h-[18px] w-[18px] text-[var(--accent)]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-[14px] font-semibold text-[var(--text)]">{item.name}</h3><p className="mt-0.5 text-[10.5px] text-[var(--text-4)]">{item.provider} · {item.category}</p></div><Pill tone={tone} className="shrink-0 !px-2 !py-0.5 !text-[9px]">{item.status}</Pill></div><p className="mt-3 text-[12px] leading-relaxed text-[var(--text-2)]">{item.purpose}</p></div></div>
    <div className="grid gap-4 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-2)_38%,transparent)] px-4 py-3 text-[10.5px] sm:grid-cols-2 sm:px-5"><Meta label="Connection method" value={item.method} /><Meta label="Capabilities" value={item.capabilities.join(" · ")} />{item.dependency && <Meta label="Infrastructure dependency" value={item.dependency} />}{item.accountIdentity && <Meta label="Account" value={item.accountIdentity} />}{item.lastVerified && <Meta label="Last verified" value={item.lastVerified} />}<Meta label="Provenance" value={item.provenance} icon={<Bot className="h-3 w-3 text-[var(--text-4)]" />} /></div>
  </article>;
}

function Meta({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="min-w-0"><div className="text-[var(--text-4)]">{label}</div><div className="mt-1 flex items-start gap-1.5 leading-relaxed text-[var(--text-2)]">{icon}{value}</div></div>;
}
