"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Boxes, CheckCircle2, CircleOff, FilterX, RefreshCw, Search, ShieldCheck, Wrench } from "lucide-react";
import { EmptyState, Panel, Pill, Skeleton, rise } from "@/components/ui/kit";
import type { HermesSkill, HermesSkillsSnapshot, SkillSource } from "@/lib/hermes-skills";

const inputClass = "rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[12px] text-[var(--text-2)] outline-none";
const sourceLabel: Record<SkillSource, string> = { builtin: "Built-in", hub: "Hub-installed", local: "Local", unknown: "Unknown" };

function dateLabel(value: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(date);
}

async function getSkills(signal: AbortSignal) {
  const response = await fetch("/api/hermes/skills", { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<HermesSkillsSnapshot>;
}

export default function SkillsPage() {
  const [snapshot, setSnapshot] = useState<HermesSkillsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async (quiet = false) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    if (quiet) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const next = await getSkills(current.signal);
      if (!current.signal.aborted) setSnapshot(next);
    } catch (cause) {
      if (!current.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load the skill inventory.");
    } finally {
      if (!current.signal.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => { void load(); });
    return () => { cancelAnimationFrame(frame); controller.current?.abort(); };
  }, [load]);

  const skills = useMemo(() => snapshot?.skills ?? [], [snapshot]);
  const categories = useMemo(() => [...new Set(skills.map((skill) => skill.category).filter((value): value is string => Boolean(value)))].sort(), [skills]);
  const sources = useMemo(() => [...new Set(skills.map((skill) => skill.source))].sort(), [skills]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return skills.filter((skill) => {
      if (category !== "all" && skill.category !== category) return false;
      if (source !== "all" && skill.source !== source) return false;
      if (status === "enabled" && skill.enabled !== true) return false;
      if (status === "disabled" && skill.enabled !== false) return false;
      if (status === "unknown" && skill.enabled !== null) return false;
      return !needle || [skill.name, skill.slug, skill.category, skill.source, skill.trust].some((value) => value?.toLowerCase().includes(needle));
    });
  }, [category, query, skills, source, status]);
  const filtersActive = Boolean(query.trim()) || category !== "all" || source !== "all" || status !== "all";
  const clearFilters = () => { setQuery(""); setCategory("all"); setSource("all"); setStatus("all"); };
  const available = snapshot?.available === true;
  const hasWarnings = Boolean(snapshot?.warnings.length);

  return <div className="relative z-10 w-full space-y-6 pb-16 pt-7">
    <header className="hq-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={rise(0)}>
      <div>
        <div className="eyebrow mb-1.5">Hermes capabilities</div>
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[34px]">Skills</h1><Pill tone="neutral">Read-only</Pill></div>
        <p className="mt-1 max-w-2xl text-[12.5px] text-[var(--text-2)]">Capabilities reported by the Hermes runtime.</p>
        <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-[var(--text-3)]">Installed and enabled status reflects the latest Bridge snapshot. It does not confirm setup, usage, health, compatibility, or agent assignment.</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="num text-[10.5px] text-[var(--text-3)]" aria-live="polite">Snapshot {dateLabel(snapshot?.syncedAt ?? null)}</span>
        <button type="button" onClick={() => void load(true)} disabled={loading || refreshing} className="btn-ghost inline-flex items-center gap-2 px-3.5 py-2 text-[12px] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
      </div>
    </header>

    {error && <div role="alert"><Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2 text-[12px] text-[var(--warn)]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{snapshot ? "Refresh failed. Previously loaded skills remain visible and may be stale." : `Skill inventory could not be loaded. ${error}`}</span></div><button type="button" onClick={() => void load(Boolean(snapshot))} className="btn-ghost px-3 py-1.5 text-[11px]">Try again</button></Panel></div>}

    {snapshot?.stale && <div role="alert"><Panel className="flex items-start gap-2 p-4 text-[12px] text-[var(--warn)]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>This snapshot may be stale. Last successful sync: {dateLabel(snapshot.syncedAt)}. Latest attempt: {dateLabel(snapshot.lastAttemptAt)}.</p></Panel></div>}

    {hasWarnings && <div role="status"><Panel className="border-[color-mix(in_srgb,var(--warn)_25%,var(--line))] p-4"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]" /><div><p className="text-[12px] font-medium text-[var(--text)]">{available ? "Partial inventory" : "Inventory unavailable"}</p><ul className="mt-1 space-y-1 text-[11px] leading-relaxed text-[var(--text-3)]">{snapshot?.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div></div></Panel></div>}

    <section aria-label="Skill inventory summary" aria-busy={loading} className="hq-rise" style={rise(1)}>
      <Panel className="overflow-hidden !border-[color-mix(in_srgb,var(--accent)_22%,var(--line))] !bg-[linear-gradient(120deg,color-mix(in_srgb,var(--accent)_7%,var(--surface-1)),var(--surface-1)_48%,color-mix(in_srgb,#8b5cf6_5%,var(--surface-1)))]">
        {loading && !snapshot ? <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div> : <div>
          <div className="flex flex-col gap-2 border-b border-[var(--line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2.5"><span className={`h-2 w-2 rounded-full ${available ? "bg-[var(--up)]" : "bg-[var(--text-4)]"}`} /><h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text)]">Runtime inventory</h2></div><span className="num text-[10px] text-[var(--text-3)]">Hermes {snapshot?.runtime.version ?? "version unavailable"} · {snapshot?.runtime.profile ?? "default"} profile</span></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5"><Metric label="Skills listed" value={available ? snapshot?.counts.verified : null} note="Individually parsed records" /><Metric label="Enabled" value={available ? snapshot?.counts.enabled : null} note="Eligible to load" /><Metric label="Disabled" value={available ? snapshot?.counts.disabled : null} note="Installed, not enabled" /><Metric label="Built-in" value={available ? snapshot?.counts.builtin : null} note="Bundled by Hermes" /><Metric label="Other sources" value={available && snapshot?.counts.hub != null && snapshot.counts.local != null ? snapshot.counts.hub + snapshot.counts.local : null} note="Hub-installed + local" /></div>
          <div className="border-t border-[var(--line)] px-5 py-3 text-[10.5px] text-[var(--text-3)]">Coverage: <span className="font-medium capitalize text-[var(--text-2)]">{snapshot?.completeness ?? "unknown"}</span>{snapshot?.counts.profileReported != null && snapshot.counts.profileReported !== snapshot.counts.listReported ? ` · Profile summary: ${snapshot.counts.profileReported} · Individually listed: ${snapshot.counts.listReported ?? "unavailable"}` : ""}</div>
        </div>}
      </Panel>
    </section>

    {available && <section className="hq-rise" style={rise(2)} aria-label="Skill filters"><Panel className="p-3 sm:p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(145px,0.45fr))_auto]">
      <label className="relative"><span className="sr-only">Search skills</span><Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-4)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search skills" className={`${inputClass} w-full pl-9`} /></label>
      <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select aria-label="Filter by source" value={source} onChange={(event) => setSource(event.target.value)} className={inputClass}><option value="all">All sources</option>{sources.map((item) => <option key={item} value={item}>{sourceLabel[item]}</option>)}</select>
      <select aria-label="Filter by runtime status" value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}><option value="all">All statuses</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option>{skills.some((skill) => skill.enabled === null) && <option value="unknown">Unknown</option>}</select>
      <button type="button" onClick={clearFilters} disabled={!filtersActive} className="btn-ghost inline-flex items-center justify-center gap-2 px-3 py-2 text-[11px] disabled:opacity-40"><FilterX className="h-3.5 w-3.5" />Clear</button>
    </div></Panel></section>}

    <section className="hq-rise" style={rise(3)} aria-labelledby="skill-library" aria-busy={loading}>
      <div className="mb-3 flex items-end justify-between gap-4"><div><div className="eyebrow">Runtime registry</div><h2 id="skill-library" className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--text)]">Installed skills</h2></div>{available && <span className="num text-[10.5px] text-[var(--text-3)]">{filtered.length} shown · {skills.length} loaded</span>}</div>
      {loading && !snapshot ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading installed skills">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-40" />)}</div>
        : !snapshot && error ? <Panel><EmptyState icon={<CircleOff className="h-6 w-6" />} title="Skill inventory unavailable" hint="Use Try again to retry the authenticated API." /></Panel>
        : !available ? <Panel><EmptyState icon={<CircleOff className="h-6 w-6" />} title="No Hermes skill inventory snapshot is available" hint="Skills will appear after the Bridge completes its first successful read-only runtime discovery." /></Panel>
        : !skills.length && snapshot?.counts.listReported === 0 ? <Panel><EmptyState icon={<Boxes className="h-6 w-6" />} title="Hermes reported no installed skills" hint="The latest successful snapshot explicitly reported zero installed skills." /></Panel>
        : !skills.length ? <Panel><EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="No verified skill records could be parsed" hint={`Hermes reported ${snapshot?.counts.listReported ?? "an unknown number of"} installed skills, but this snapshot contains no usable records.`} /></Panel>
        : !filtered.length ? <Panel><EmptyState icon={<Search className="h-6 w-6" />} title="No skills match these filters" hint="Change the search or clear filters to see the loaded inventory." action={<button type="button" onClick={clearFilters} className="btn-ghost px-3 py-1.5 text-[11px]">Clear filters</button>} /></Panel>
        : <div className="grid max-w-[1680px] gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{filtered.map((skill) => <SkillCard key={skill.name} skill={skill} />)}</div>}
    </section>
  </div>;
}

function Metric({ label, value, note }: { label: string; value: number | null | undefined; note: string }) {
  return <div className="border-b border-[var(--line)] p-5 last:border-b-0 sm:[&:nth-last-child(-n+1)]:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0"><p className="eyebrow !text-[9.5px]">{label}</p><p className="num mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[var(--text)]">{value ?? "—"}</p><p className="mt-1 text-[10px] text-[var(--text-4)]">{note}</p></div>;
}

function SkillCard({ skill }: { skill: HermesSkill }) {
  const status = skill.enabled === true ? "Enabled" : skill.enabled === false ? "Disabled" : "Status unknown";
  return <article className="panel w-full min-w-0 p-5 lg:max-w-[330px]">
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)]"><Wrench className="h-4 w-4 text-[var(--accent)]" /></span><div className="min-w-0"><h3 className="truncate text-[14px] font-semibold text-[var(--text)]" title={skill.name}>{skill.name}</h3><p className="num mt-0.5 truncate text-[9.5px] text-[var(--text-4)]" title={skill.slug}>{skill.slug}</p></div></div><Pill tone={skill.enabled === true ? "up" : skill.enabled === false ? "neutral" : "warn"} className="shrink-0 !px-2 !py-0.5 !text-[9px]">{skill.enabled === true ? <CheckCircle2 className="h-3 w-3" /> : <CircleOff className="h-3 w-3" />}{status}</Pill></div>
    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--line)] pt-4 text-[10.5px]"><div><dt className="text-[var(--text-4)]">Category</dt><dd className="mt-1 truncate text-[var(--text-2)]" title={skill.category ?? undefined}>{skill.category ?? "Unavailable"}</dd></div><div><dt className="text-[var(--text-4)]">Source</dt><dd className="mt-1 text-[var(--text-2)]">{sourceLabel[skill.source]}</dd></div><div><dt className="text-[var(--text-4)]">Trust</dt><dd className="mt-1 truncate text-[var(--text-2)]">{skill.trust ?? "Unavailable"}</dd></div><div><dt className="text-[var(--text-4)]">Provenance</dt><dd className="mt-1 flex items-center gap-1 text-[var(--text-2)]"><ShieldCheck className="h-3 w-3 text-[var(--accent)]" />Runtime reported</dd></div></dl>
  </article>;
}
