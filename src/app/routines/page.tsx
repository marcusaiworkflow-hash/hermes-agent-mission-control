"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  Pause,
  Play,
  RefreshCw,
  Search,
} from "lucide-react";
import { Panel, Pill, Skeleton, rise } from "@/components/ui/kit";

type CronJob = {
  id: string;
  status: string;
  name: string;
  schedule: string;
  nextRun: string | null;
  lastRun: string | null;
  lastResult: string | null;
  deliver: string | null;
  skills: string | null;
  script: string | null;
  mode: string | null;
};

type Filter = "all" | "active" | "paused" | "failing";
type Notice = { tone: "success" | "error" | "info"; text: string };

const FAILURE_WORDS = ["fail", "error", "timeout", "exception", "crash"];

function normalized(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function isActive(job: CronJob) {
  return normalized(job.status) === "active";
}

function isPaused(job: CronJob) {
  return normalized(job.status) === "paused";
}

function isFailing(job: CronJob) {
  const evidence = `${normalized(job.status)} ${normalized(job.lastResult)}`;
  return FAILURE_WORDS.some((word) => evidence.includes(word));
}

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTimestamp(value: string | null) {
  const date = parseDate(value);
  if (!date) return value || "—";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function relativeTime(value: string | null) {
  const date = parseDate(value);
  if (!date) return value || "—";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function countdown(value: string | null, now: number) {
  const date = parseDate(value);
  if (!date) return "Awaiting schedule";
  const total = Math.max(0, date.getTime() - now);
  if (total === 0) return "Due now";
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function sameLocalDay(date: Date, compare: Date) {
  return date.getFullYear() === compare.getFullYear()
    && date.getMonth() === compare.getMonth()
    && date.getDate() === compare.getDate();
}

async function getCrons() {
  const response = await fetch("/api/hermes/crons", { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<{ jobs: CronJob[]; syncedAt: string | null }>;
}

export default function RoutinesPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Record<string, "pause" | "resume">>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getCrons();
      setJobs(data.jobs ?? []);
      setSyncedAt(data.syncedAt ?? null);
      return data.jobs ?? [];
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load routines.");
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(() => ({
    active: jobs.filter(isActive).length,
    paused: jobs.filter(isPaused).length,
    failing: jobs.filter(isFailing).length,
  }), [jobs]);

  const nextJob = useMemo(() => jobs
    .filter(isActive)
    .map((job) => ({ job, date: parseDate(job.nextRun) }))
    .filter((entry): entry is { job: CronJob; date: Date } => entry.date !== null && entry.date.getTime() >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null, [jobs, now]);

  const todayJobs = useMemo(() => jobs
    .map((job) => ({ job, date: parseDate(job.nextRun) }))
    .filter((entry): entry is { job: CronJob; date: Date } => entry.date !== null && sameLocalDay(entry.date, new Date(now)))
    .sort((a, b) => a.date.getTime() - b.date.getTime()), [jobs, now]);

  const upcoming = useMemo(() => jobs
    .filter(isActive)
    .map((job) => ({ job, date: parseDate(job.nextRun) }))
    .filter((entry): entry is { job: CronJob; date: Date } => entry.date !== null && entry.date.getTime() >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4), [jobs, now]);

  const visibleJobs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (filter === "active" && !isActive(job)) return false;
      if (filter === "paused" && !isPaused(job)) return false;
      if (filter === "failing" && !isFailing(job)) return false;
      if (!needle) return true;
      return [job.name, job.schedule, job.status, job.mode, job.deliver, job.skills, job.script, job.lastResult]
        .some((value) => normalized(value).includes(needle));
    }).sort((a, b) => {
      const aTime = parseDate(a.nextRun)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = parseDate(b.nextRun)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return Number(isActive(b)) - Number(isActive(a)) || aTime - bTime || a.name.localeCompare(b.name);
    });
  }, [filter, jobs, query]);

  const toggleJob = async (job: CronJob) => {
    const op = isActive(job) ? "pause" : "resume";
    const expected = op === "pause" ? "paused" : "active";
    setPending((current) => ({ ...current, [job.id]: op }));
    setNotice(null);
    try {
      const response = await fetch("/api/hermes/crons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, id: job.id, name: job.name }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      setNotice({ tone: "info", text: `${op === "pause" ? "Pause" : "Resume"} queued for ${job.name || job.id}. Reconciling with Hermes…` });
      let reconciled = false;
      for (const delay of [1200, 2200, 3600, 5000]) {
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        const refreshed = await load(true);
        const current = refreshed?.find((item) => item.id === job.id);
        if (current && normalized(current.status) === expected) {
          reconciled = true;
          break;
        }
      }
      setNotice(reconciled
        ? { tone: "success", text: `${job.name || job.id} is now ${expected}.` }
        : { tone: "info", text: `Request queued. Hermes has not reflected the ${expected} state yet; refresh to reconcile.` });
    } catch (cause) {
      setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "Unable to submit routine request." });
    } finally {
      setPending((current) => { const next = { ...current }; delete next[job.id]; return next; });
    }
  };

  return <div className="relative z-10 w-full pb-16 pt-1">
    <header className="hq-rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" style={rise(0)}>
      <div>
        <div className="eyebrow mb-1.5">Hermes automation</div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[34px]">Routines</h1>
        <p className="mt-1 max-w-xl text-[12.5px] text-[var(--text-2)]">Monitor recurring Hermes jobs, schedules, and current execution state.</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="num text-[10.5px] text-[var(--text-3)]">Synced {relativeTime(syncedAt)}</span>
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="btn-ghost inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium disabled:opacity-50">
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>
    </header>

    {error && <div className="mt-4 flex items-center gap-3 rounded-[var(--r-sm)] border border-[color-mix(in_srgb,var(--down)_30%,var(--line))] bg-[color-mix(in_srgb,var(--down)_7%,var(--surface-1))] px-4 py-3 text-[11px] text-[var(--text-2)]">
      <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--down)]" /><span><strong className="font-medium text-[var(--text)]">Routines could not be loaded.</strong> {error}. No cached or fabricated schedule is shown.</span>
      <button type="button" onClick={() => void load()} className="ml-auto shrink-0 font-medium text-[var(--accent)]">Try again</button>
    </div>}

    {notice && <div className={`mt-4 flex items-center gap-2 rounded-[var(--r-sm)] border px-4 py-2.5 text-[11px] ${notice.tone === "error" ? "border-[color-mix(in_srgb,var(--down)_30%,var(--line))] text-[var(--down)]" : notice.tone === "success" ? "border-[color-mix(in_srgb,var(--up)_25%,var(--line))] text-[var(--up)]" : "border-[color-mix(in_srgb,var(--accent)_25%,var(--line))] text-[var(--text-2)]"}`}>
      {notice.tone === "error" ? <AlertTriangle className="h-3.5 w-3.5" /> : notice.tone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5 text-[var(--accent)]" />}{notice.text}
    </div>}

    <section className="hq-rise mt-5" style={rise(1)} aria-labelledby="scheduler-overview">
      <Panel className="overflow-hidden !border-[color-mix(in_srgb,var(--accent)_24%,var(--line))] !bg-[linear-gradient(120deg,color-mix(in_srgb,var(--accent)_7%,var(--surface-1)),var(--surface-1)_45%,color-mix(in_srgb,#9b8cff_5%,var(--surface-1)))] p-0">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5"><span className={`h-1.5 w-1.5 rounded-full ${counts.active ? "bg-[var(--up)] shadow-[0_0_10px_var(--up)]" : "bg-[var(--text-4)]"}`} /><h2 id="scheduler-overview" className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text)]">Scheduler overview</h2></div>
          <span className="num text-[10px] text-[var(--text-3)]">{counts.active ? "Scheduler armed" : "No active schedules"}</span>
        </div>
        <div className="grid lg:grid-cols-[2fr_3fr]">
          <div className="border-b border-[var(--line)] p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <p className="eyebrow !text-[10px]">Next to fire</p>
            {loading ? <div className="mt-5 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-12 w-4/5" /><Skeleton className="h-4 w-1/2" /></div> : nextJob ? <>
              <p className="mt-4 truncate text-[17px] font-semibold text-[var(--text)]" title={nextJob.job.name}>{nextJob.job.name || nextJob.job.id}</p>
              <p className="num mt-2 text-[36px] font-semibold leading-none tracking-[-0.05em] text-[var(--accent)] sm:text-[44px]">{countdown(nextJob.job.nextRun, now)}</p>
              <p className="num mt-3 text-[10.5px] text-[var(--text-2)]">{formatTimestamp(nextJob.job.nextRun)}</p>
              <p className="num mt-1 text-[10px] text-[var(--text-4)]">{nextJob.job.schedule || "Schedule expression unavailable"}</p>
            </> : <div className="flex min-h-[140px] items-center"><div><CalendarClock className="h-5 w-5 text-[var(--text-4)]" /><p className="mt-3 text-[13px] font-medium text-[var(--text-2)]">No upcoming active run</p><p className="mt-1 max-w-xs text-[11px] leading-relaxed text-[var(--text-4)]">An active routine with a valid future next-run timestamp will appear here.</p></div></div>}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-4">
              <HeroStat label="Active" value={counts.active} color="var(--up)" />
              <HeroStat label="Paused" value={counts.paused} />
              <HeroStat label="Failing" value={counts.failing} color={counts.failing ? "var(--down)" : undefined} />
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[13px] font-semibold text-[var(--text)]">Upcoming firing order</p><p className="mt-1 text-[10.5px] text-[var(--text-3)]">Real next-run timestamps from the latest Hermes sync</p></div><Pill tone="neutral" className="!px-2 !py-0.5 !text-[9px]">{upcoming.length} scheduled</Pill></div>
            {loading ? <div className="mt-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : upcoming.length ? <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">{upcoming.map(({ job, date }, index) => <div key={job.id} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
              <span className="num text-[10px] text-[var(--text-4)]">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0"><p className="truncate text-[12px] font-medium text-[var(--text)]">{job.name || job.id}</p><p className="num mt-0.5 truncate text-[9.5px] text-[var(--text-4)]">{job.schedule}</p></div>
              <div className="text-right"><p className="num text-[11px] text-[var(--text-2)]">{date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p><p className="num mt-0.5 text-[9.5px] text-[var(--text-4)]">{relativeTime(job.nextRun)}</p></div>
            </div>)}</div> : <div className="mt-4 flex min-h-[150px] items-center justify-center rounded-[var(--r-sm)] border border-dashed border-[var(--line)] text-center"><div><Clock3 className="mx-auto h-5 w-5 text-[var(--text-4)]" /><p className="mt-2 text-[11px] font-medium text-[var(--text-2)]">No upcoming firing order</p><p className="mt-1 text-[10px] text-[var(--text-4)]">Future active timestamps are not currently available.</p></div></div>}
            <div className="mt-4 flex items-start gap-2 border-t border-[var(--line)] pt-3 text-[10px] leading-relaxed text-[var(--text-4)]"><History className="mt-0.5 h-3 w-3 shrink-0" /><p>Run-history chart unavailable: the current API exposes the latest run and result, but not a genuine time series.</p></div>
          </div>
        </div>
      </Panel>
    </section>

    <section className="hq-rise mt-4" style={rise(2)} aria-labelledby="today-timeline">
      <Panel className="p-4 sm:p-5">
        <div className="flex items-end justify-between gap-4"><div><p className="eyebrow !text-[10px]">Today</p><h2 id="today-timeline" className="mt-1 text-[15px] font-semibold text-[var(--text)]">Schedule timeline</h2></div><span className="num text-[10px] text-[var(--text-3)]">{todayJobs.length} next run{todayJobs.length === 1 ? "" : "s"} today</span></div>
        {loading ? <Skeleton className="mt-5 h-24 w-full" /> : todayJobs.length ? <DayTimeline entries={todayJobs} now={new Date(now)} /> : <div className="mt-4 flex min-h-[92px] items-center justify-center rounded-[var(--r-sm)] border border-dashed border-[var(--line)] px-4 text-center"><div><p className="text-[11px] font-medium text-[var(--text-2)]">No routines currently point to today</p><p className="mt-1 text-[10px] text-[var(--text-4)]">Only real next-run timestamps on your local calendar day are plotted.</p></div></div>}
      </Panel>
    </section>

    <section className="hq-rise mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" style={rise(3)} aria-label="Routine filters">
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip label="All" count={jobs.length} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterChip label="Active" count={counts.active} active={filter === "active"} onClick={() => setFilter("active")} />
        <FilterChip label="Paused" count={counts.paused} active={filter === "paused"} onClick={() => setFilter("paused")} />
        <FilterChip label="Failing" count={counts.failing} active={filter === "failing"} onClick={() => setFilter("failing")} tone={counts.failing ? "down" : undefined} />
      </div>
      <label className="flex h-8 w-full items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-1)] px-3 text-[var(--text-3)] focus-within:border-[var(--line-strong)] lg:w-[290px]">
        <Search className="h-3.5 w-3.5 shrink-0" /><span className="sr-only">Search routines</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search routines or metadata" className="min-w-0 flex-1 bg-transparent text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--text-4)]" />
      </label>
    </section>

    <section className="hq-rise mt-3" style={rise(4)} aria-labelledby="routine-registry">
      <div className="mb-2 flex items-end justify-between"><div><p className="eyebrow !text-[10px]">Registry</p><h2 id="routine-registry" className="mt-1 text-[15px] font-semibold text-[var(--text)]">Routine schedule</h2></div><span className="num text-[10px] text-[var(--text-4)]">{visibleJobs.length} shown</span></div>
      <Panel className="overflow-hidden p-0">
        {loading ? <RegistrySkeleton /> : visibleJobs.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1120px] table-fixed border-collapse text-left">
          <thead><tr className="border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)] text-[9.5px] uppercase tracking-[0.11em] text-[var(--text-4)]">
            <th className="w-[155px] px-4 py-3 font-medium">Schedule</th><th className="w-[225px] px-3 py-3 font-medium">Routine</th><th className="w-[105px] px-3 py-3 font-medium">Status</th><th className="w-[190px] px-3 py-3 font-medium">Workflow</th><th className="w-[155px] px-3 py-3 font-medium">Next run</th><th className="w-[155px] px-3 py-3 font-medium">Last run</th><th className="w-[165px] px-3 py-3 font-medium">Last result</th><th className="w-[90px] px-4 py-3 text-right font-medium">Enabled</th>
          </tr></thead>
          <tbody className="divide-y divide-[var(--line)]">{visibleJobs.map((job) => <RoutineRow key={job.id} job={job} pending={pending[job.id]} onToggle={() => void toggleJob(job)} />)}</tbody>
        </table></div> : <div className="flex min-h-[230px] items-center justify-center px-6 text-center"><div><CalendarClock className="mx-auto h-6 w-6 text-[var(--text-4)]" /><p className="mt-3 text-[13px] font-medium text-[var(--text-2)]">{jobs.length ? "No routines match these filters" : "No routines scheduled"}</p><p className="mt-1 max-w-sm text-[11px] text-[var(--text-4)]">{jobs.length ? "Try a different status or search term." : "Real Hermes cron jobs will appear here after the Bridge syncs them."}</p>{jobs.length > 0 && <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="mt-3 text-[11px] font-medium text-[var(--accent)]">Clear filters</button>}</div></div>}
      </Panel>
    </section>
  </div>;
}

function HeroStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return <div><p className="num text-[17px] font-semibold" style={{ color: color ?? "var(--text)" }}>{value}</p><p className="mt-0.5 text-[9.5px] text-[var(--text-4)]">{label}</p></div>;
}

function DayTimeline({ entries, now }: { entries: Array<{ job: CronJob; date: Date }>; now: Date }) {
  const currentPosition = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  return <div className="mt-5 overflow-x-auto pb-1"><div className="min-w-[720px] px-2">
    <div className="relative h-[58px]">
      <div className="absolute inset-x-0 top-7 h-px bg-[var(--line-strong)]" />
      {[0, 6, 12, 18, 24].map((hour) => <div key={hour} className="absolute top-5 h-2.5 w-px bg-[var(--line-strong)]" style={{ left: `${(hour / 24) * 100}%` }}><span className={`num absolute top-4 text-[9px] text-[var(--text-4)] ${hour === 24 ? "-translate-x-full" : hour ? "-translate-x-1/2" : ""}`}>{String(hour).padStart(2, "0")}:00</span></div>)}
      <div className="absolute top-1 h-10 w-px bg-[color-mix(in_srgb,var(--accent)_55%,transparent)]" style={{ left: `${currentPosition}%` }}><span className="absolute -left-1 top-[23px] h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" /></div>
      {entries.map(({ job, date }, index) => {
        const position = ((date.getHours() * 60 + date.getMinutes()) / 1440) * 100;
        return <div key={job.id} className="group absolute top-[19px] -translate-x-1/2" style={{ left: `${position}%` }}>
          <span className={`block h-[18px] w-[18px] rounded-full border-[5px] border-[var(--surface-1)] ${isActive(job) ? "bg-[var(--up)]" : "bg-[var(--text-3)]"}`} />
          <div className={`pointer-events-none absolute z-20 hidden w-48 rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface-3)] p-2.5 shadow-xl group-hover:block ${position > 78 ? "right-0" : position < 22 ? "left-0" : "left-1/2 -translate-x-1/2"} ${index % 2 ? "bottom-7" : "top-7"}`}>
            <p className="truncate text-[11px] font-medium text-[var(--text)]">{job.name || job.id}</p><p className="num mt-1 text-[9.5px] text-[var(--text-2)]">{date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p><p className="num mt-0.5 truncate text-[9px] text-[var(--text-4)]">{job.schedule}</p>
          </div>
        </div>;
      })}
    </div>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--line)] pt-3">{entries.map(({ job, date }) => <div key={job.id} className="flex min-w-0 items-center gap-2 text-[10px]"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive(job) ? "bg-[var(--up)]" : "bg-[var(--text-3)]"}`} /><span className="num text-[var(--text-3)]">{date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span><span className="max-w-[170px] truncate text-[var(--text-2)]">{job.name || job.id}</span></div>)}</div>
  </div></div>;
}

function FilterChip({ label, count, active, onClick, tone }: { label: string; count: number; active: boolean; onClick: () => void; tone?: "down" }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10.5px] font-medium transition-colors ${active ? "border-[var(--line-strong)] bg-[var(--surface-2)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-3)] hover:border-[var(--line-strong)] hover:text-[var(--text-2)]"}`}>
    {label}<span className="num text-[9.5px]" style={tone && count ? { color: "var(--down)" } : undefined}>{count}</span>
  </button>;
}

function RoutineRow({ job, pending, onToggle }: { job: CronJob; pending?: "pause" | "resume"; onToggle: () => void }) {
  const active = isActive(job);
  const failing = isFailing(job);
  const canToggle = active || isPaused(job);
  const metadata = [job.mode, job.deliver && `→ ${job.deliver}`, job.skills].filter(Boolean);
  return <tr className="group transition-colors hover:bg-[color-mix(in_srgb,var(--surface-2)_50%,transparent)]">
    <td className="px-4 py-3 align-top"><p className="num truncate text-[10.5px] text-[var(--text-2)]" title={job.schedule}>{job.schedule || "—"}</p></td>
    <td className="px-3 py-3 align-top"><p className="truncate text-[12px] font-medium text-[var(--text)]" title={job.name || job.id}>{job.name || job.id}</p><p className="num mt-1 truncate text-[9px] text-[var(--text-4)]" title={job.id}>{job.id}</p></td>
    <td className="px-3 py-3 align-top"><Pill tone={failing ? "down" : active ? "up" : "neutral"} className="!px-2 !py-0.5 !text-[9px]"><span className="h-1 w-1 rounded-full bg-current" />{job.status || "unknown"}</Pill></td>
    <td className="px-3 py-3 align-top"><p className="truncate text-[10.5px] text-[var(--text-2)]" title={metadata.join(" · ")}>{metadata.join(" · ") || "—"}</p>{job.script && <p className="mt-1 truncate text-[9px] text-[var(--text-4)]" title={job.script}>{job.script}</p>}</td>
    <td className="px-3 py-3 align-top"><p className="num text-[10.5px] text-[var(--text-2)]">{relativeTime(job.nextRun)}</p>{job.nextRun && <p className="num mt-1 truncate text-[9px] text-[var(--text-4)]" title={formatTimestamp(job.nextRun)}>{formatTimestamp(job.nextRun)}</p>}</td>
    <td className="px-3 py-3 align-top"><p className="num text-[10.5px] text-[var(--text-2)]">{relativeTime(job.lastRun)}</p>{job.lastRun && <p className="num mt-1 truncate text-[9px] text-[var(--text-4)]" title={formatTimestamp(job.lastRun)}>{formatTimestamp(job.lastRun)}</p>}</td>
    <td className="px-3 py-3 align-top"><p className={`truncate text-[10.5px] ${failing ? "text-[var(--down)]" : "text-[var(--text-2)]"}`} title={job.lastResult || undefined}>{job.lastResult || "—"}</p></td>
    <td className="px-4 py-3 text-right align-top"><button type="button" role="switch" aria-checked={active} aria-label={`${active ? "Pause" : "Resume"} ${job.name || job.id}`} title={!canToggle ? `Unsupported status: ${job.status || "unknown"}` : active ? "Pause routine" : "Resume routine"} disabled={!canToggle || Boolean(pending)} onClick={onToggle} className={`relative inline-flex h-6 w-10 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-[color-mix(in_srgb,var(--up)_40%,transparent)] bg-[color-mix(in_srgb,var(--up)_25%,var(--surface-2))]" : "border-[var(--line-strong)] bg-[var(--surface-2)]"}`}>
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--text)] text-[#0a0b0d] transition-transform ${active ? "translate-x-[19px]" : "translate-x-[3px]"}`}>{pending ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : active ? <Play className="h-2 w-2 fill-current" /> : <Pause className="h-2 w-2 fill-current" />}</span>
    </button></td>
  </tr>;
}

function RegistrySkeleton() {
  return <div className="p-4"><Skeleton className="h-9 w-full" /><div className="mt-2 space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div></div>;
}
