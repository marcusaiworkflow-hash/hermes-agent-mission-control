"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  TimerReset,
} from "lucide-react";
import { Panel, Skeleton, rise } from "@/components/ui/kit";

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

type EventType = "routine" | "agent_job" | "meeting" | "deadline";
type CalendarEvent = {
  id: string;
  title: string;
  type: EventType;
  start: Date;
  end: Date | null;
  status: string;
  source: "hermes_cron";
  metadata: {
    schedule: string;
    deliver: string | null;
    skills: string | null;
    script: string | null;
    mode: string | null;
    lastRun: string | null;
    lastResult: string | null;
  };
};

type Filter = "all" | EventType;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "routine", label: "Routines" },
  { id: "agent_job", label: "Agent Jobs" },
  { id: "meeting", label: "Meetings" },
  { id: "deadline", label: "Deadlines" },
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function validDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeCrons(jobs: CronJob[]): CalendarEvent[] {
  return jobs.flatMap((job) => {
    const start = validDate(job.nextRun);
    if (!start) return [];
    return [{
      id: `routine:${job.id}:${start.toISOString()}`,
      title: job.name || job.id,
      type: "routine" as const,
      start,
      end: null,
      status: job.status,
      source: "hermes_cron" as const,
      metadata: {
        schedule: job.schedule,
        deliver: job.deliver,
        skills: job.skills,
        script: job.script,
        mode: job.mode,
        lastRun: job.lastRun,
        lastResult: job.lastResult,
      },
    }];
  }).sort((a, b) => a.start.getTime() - b.start.getTime());
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function timeAgo(value: string | null) {
  const date = validDate(value);
  if (!date) return "not available";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

async function getCrons() {
  const response = await fetch("/api/hermes/crons", { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<{ jobs: CronJob[]; syncedAt: string | null }>;
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [today, setToday] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState<Date | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getCrons();
      setJobs(data.jobs ?? []);
      setSyncedAt(data.syncedAt ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the operational schedule.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const localToday = new Date();
    setToday(localToday);
    setViewMonth(new Date(localToday.getFullYear(), localToday.getMonth(), 1));
    void load();
  }, [load]);

  const events = useMemo(() => normalizeCrons(jobs), [jobs]);
  const counts = useMemo<Record<Filter, number>>(() => ({
    all: events.length,
    routine: events.length,
    agent_job: 0,
    meeting: 0,
    deadline: 0,
  }), [events.length]);
  const visibleEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      if (filter !== "all" && event.type !== filter) return false;
      if (!needle) return true;
      return [event.title, event.status, event.metadata.schedule, event.metadata.mode, event.metadata.deliver]
        .some((value) => (value ?? "").toLowerCase().includes(needle));
    });
  }, [events, filter, query]);
  const eventsByDay = useMemo(() => {
    const result = new Map<string, CalendarEvent[]>();
    for (const event of visibleEvents) {
      const key = dayKey(event.start);
      result.set(key, [...(result.get(key) ?? []), event]);
    }
    return result;
  }, [visibleEvents]);
  const cells = useMemo(() => viewMonth ? monthCells(viewMonth) : [], [viewMonth]);
  const todayEvents = useMemo(() => today ? visibleEvents.filter((event) => sameDay(event.start, today)) : [], [today, visibleEvents]);
  const currentWeekStart = useMemo(() => today ? startOfWeek(today) : null, [today]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    if (!currentWeekStart) return null;
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + index);
    return date;
  }), [currentWeekStart]);
  const weeklyLoad = useMemo(() => weekDays.map((date) => date ? events.filter((event) => sameDay(event.start, date)).length : 0), [events, weekDays]);
  const weekCount = weeklyLoad.reduce((total, count) => total + count, 0);
  const peakCount = Math.max(...weeklyLoad);
  const peakIndex = peakCount ? weeklyLoad.indexOf(peakCount) : -1;
  const maxLoad = Math.max(1, peakCount);

  const moveMonth = (amount: number) => setViewMonth((current) => current ? new Date(current.getFullYear(), current.getMonth() + amount, 1) : current);
  const returnToday = () => {
    if (today) setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return <div className="relative z-10 w-full pb-16 pt-1">
    <header className="hq-rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" style={rise(0)}>
      <div>
        <div className="eyebrow mb-1.5">Operational schedule</div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[34px]">Calendar</h1>
        <p className="mt-1 max-w-2xl text-[12.5px] text-[var(--text-2)]">One time-based view for routines now—and agent jobs, meetings, and deadlines as real sources come online.</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="num text-[10.5px] text-[var(--text-3)]">Synced {timeAgo(syncedAt)}</span>
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="btn-ghost inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
      </div>
    </header>

    {error && <div className="mt-4 flex items-center gap-3 rounded-[var(--r-sm)] border border-[color-mix(in_srgb,var(--down)_30%,var(--line))] bg-[color-mix(in_srgb,var(--down)_7%,var(--surface-1))] px-4 py-3 text-[11px] text-[var(--text-2)]"><AlertTriangle className="h-4 w-4 shrink-0 text-[var(--down)]" /><span><strong className="font-medium text-[var(--text)]">Calendar could not be loaded.</strong> {error}. No cached or fabricated events are shown.</span><button type="button" onClick={() => void load()} className="ml-auto shrink-0 font-medium text-[var(--accent)]">Try again</button></div>}

    <section className="hq-rise mt-5" style={rise(1)} aria-labelledby="schedule-load-title">
      <Panel className="overflow-hidden !border-[color-mix(in_srgb,var(--accent)_24%,var(--line))] !bg-[linear-gradient(115deg,color-mix(in_srgb,var(--accent)_8%,var(--surface-1)),var(--surface-1)_52%,color-mix(in_srgb,#9b8cff_6%,var(--surface-1)))] p-0">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 sm:px-5"><div className="flex items-center gap-2.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" /><h2 id="schedule-load-title" className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text)]">Schedule load</h2></div><span className="text-[10px] text-[var(--text-3)]">Next-run snapshot · no recurrence inferred</span></div>
        <div className="grid lg:grid-cols-[0.92fr_1.55fr]">
          <div className="grid grid-cols-3 border-b border-[var(--line)] lg:border-b-0 lg:border-r">
            <HeroMetric label="Today" value={today ? events.filter((event) => sameDay(event.start, today)).length : 0} hint="events" />
            <HeroMetric label="This week" value={weekCount} hint="next runs" border />
            <HeroMetric label="Peak day" value={peakIndex >= 0 ? WEEKDAYS[peakIndex] : "—"} hint={peakCount ? `${peakCount} event${peakCount === 1 ? "" : "s"}` : "no load"} border />
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4"><div><p className="text-[13px] font-semibold text-[var(--text)]">This week</p><p className="mt-1 text-[10.5px] text-[var(--text-3)]">Distinct real next-run timestamps by local day</p></div><span className="num text-[10px] text-[var(--text-4)]">{weekCount} total</span></div>
            {loading ? <Skeleton className="mt-5 h-24 w-full" /> : <div className="mt-5 grid h-24 grid-cols-7 gap-2" aria-label="Weekly routine load">
              {weekDays.map((date, index) => <div key={date ? dayKey(date) : WEEKDAYS[index]} className="flex min-w-0 flex-col items-center justify-end gap-2"><span className="num text-[9px] text-[var(--text-4)]">{weeklyLoad[index] || ""}</span><div className="flex h-12 w-full items-end overflow-hidden rounded-[5px] bg-[var(--surface-3)]"><div className="w-full rounded-[5px] bg-[linear-gradient(180deg,#8bb8ff,var(--accent))] transition-[height] duration-500" style={{ height: weeklyLoad[index] ? `${Math.max(14, (weeklyLoad[index] / maxLoad) * 100)}%` : "0%" }} /></div><span className={`text-[9.5px] ${date && today && sameDay(date, today) ? "font-semibold text-[var(--accent)]" : "text-[var(--text-3)]"}`}>{WEEKDAYS[index]}</span></div>)}
            </div>}
          </div>
        </div>
      </Panel>
    </section>

    <section className="hq-rise mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" style={rise(2)} aria-label="Calendar filters">
      <div className="flex flex-wrap items-center gap-1.5">{FILTERS.map((item) => <FilterChip key={item.id} label={item.label} count={counts[item.id]} active={filter === item.id} onClick={() => setFilter(item.id)} />)}</div>
      <label className="flex h-8 w-full items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-1)] px-3 text-[var(--text-3)] focus-within:border-[var(--line-strong)] lg:w-[290px]"><Search className="h-3.5 w-3.5 shrink-0" /><span className="sr-only">Search calendar events</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events or metadata" className="min-w-0 flex-1 bg-transparent text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--text-4)]" /></label>
    </section>

    <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]" aria-label="Month calendar and today schedule">
      <Panel className="hq-rise overflow-hidden p-0" style={rise(3)}>
        <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><p className="eyebrow !text-[9.5px]">Month view</p><h2 className="mt-1 text-[17px] font-semibold text-[var(--text)]">{viewMonth ? viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "\u00a0"}</h2></div>
          <div className="flex items-center gap-1.5"><button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="btn-ghost flex h-8 w-8 items-center justify-center"><ChevronLeft className="h-3.5 w-3.5" /></button><button type="button" onClick={returnToday} className="btn-ghost h-8 px-3 text-[10.5px] font-medium">Today</button><button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="btn-ghost flex h-8 w-8 items-center justify-center"><ChevronRight className="h-3.5 w-3.5" /></button></div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-2)_45%,transparent)]">{WEEKDAYS.map((day) => <div key={day} className="px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-4)]">{day}</div>)}</div>
            {loading || !today || !viewMonth ? <CalendarSkeleton /> : <div className="grid grid-cols-7">{cells.map((date) => {
              const dateEvents = eventsByDay.get(dayKey(date)) ?? [];
              const inMonth = date.getMonth() === viewMonth.getMonth();
              const isToday = sameDay(date, today);
              return <div key={dayKey(date)} className={`min-h-[112px] border-b border-r border-[var(--line)] p-2 last:border-r-0 ${inMonth ? "bg-transparent" : "bg-[color-mix(in_srgb,var(--bg)_32%,transparent)]"}`}>
                <div className="flex items-center justify-between"><span className={`num flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${isToday ? "bg-[var(--accent)] font-semibold text-[#09101a]" : inMonth ? "text-[var(--text-2)]" : "text-[var(--text-4)]"}`}>{date.getDate()}</span>{dateEvents.length > 2 && <span className="num text-[8px] text-[var(--text-4)]">+{dateEvents.length - 2}</span>}</div>
                <div className="mt-2 space-y-1">{dateEvents.slice(0, 2).map((event) => <EventPill key={event.id} event={event} />)}</div>
              </div>;
            })}</div>}
          </div>
        </div>
      </Panel>

      <Panel className="hq-rise overflow-hidden p-0 xl:sticky xl:top-6" style={rise(4)}>
        <div className="border-b border-[var(--line)] px-4 py-4"><div className="flex items-center justify-between"><div><p className="eyebrow !text-[9.5px]">Today</p><h2 className="mt-1 text-[15px] font-semibold text-[var(--text)]">{today ? today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "\u00a0"}</h2></div><span className="num rounded-full bg-[var(--surface-2)] px-2 py-1 text-[9px] text-[var(--text-3)]">{todayEvents.length}</span></div></div>
        {loading ? <div className="space-y-3 p-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : todayEvents.length ? <div className="divide-y divide-[var(--line)]">{todayEvents.map((event) => <TodayEvent key={event.id} event={event} />)}</div> : <div className="flex min-h-[320px] items-center justify-center px-6 text-center"><div><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-2)]"><CalendarDays className="h-4 w-4 text-[var(--text-4)]" /></span><p className="mt-3 text-[12px] font-medium text-[var(--text-2)]">No events scheduled today</p><p className="mt-1.5 text-[10.5px] leading-relaxed text-[var(--text-4)]">This rail only shows genuine next-run timestamps from available event sources.</p></div></div>}
        <div className="border-t border-[var(--line)] px-4 py-3 text-[9.5px] leading-relaxed text-[var(--text-4)]">Meetings, agent jobs, and deadlines remain empty until real schedule sources are connected.</div>
      </Panel>
    </section>
  </div>;
}

function HeroMetric({ label, value, hint, border = false }: { label: string; value: number | string; hint: string; border?: boolean }) {
  return <div className={`flex min-h-[168px] flex-col justify-center p-4 sm:p-5 ${border ? "border-l border-[var(--line)]" : ""}`}><p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-4)]">{label}</p><p className="num mt-3 truncate text-[28px] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-[34px]">{value}</p><p className="mt-1 text-[9.5px] text-[var(--text-3)]">{hint}</p></div>;
}

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-medium transition-colors ${active ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-1))] text-[var(--text)]" : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-3)] hover:border-[var(--line-strong)] hover:text-[var(--text-2)]"}`}><span>{label}</span><span className="num text-[9px] opacity-70">{count}</span></button>;
}

function EventPill({ event }: { event: CalendarEvent }) {
  return <div title={`${formatTime(event.start)} · ${event.title} · ${event.metadata.schedule}`} className="overflow-hidden rounded-[5px] border border-[color-mix(in_srgb,var(--accent)_24%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_9%,var(--surface-2))] px-2 py-1.5"><div className="flex min-w-0 items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" /><span className="num shrink-0 text-[8.5px] text-[var(--accent)]">{formatTime(event.start)}</span><span className="truncate text-[9.5px] font-medium text-[var(--text-2)]">{event.title}</span></div></div>;
}

function TodayEvent({ event }: { event: CalendarEvent }) {
  const metadata = [event.metadata.mode, event.metadata.deliver].filter(Boolean).join(" · ") || event.metadata.schedule;
  return <div className="grid grid-cols-[54px_minmax(0,1fr)] gap-3 px-4 py-4"><div><p className="num text-[10.5px] font-medium text-[var(--text)]">{formatTime(event.start)}</p><div className="mt-2 h-8 w-px bg-[linear-gradient(var(--accent),transparent)]" /></div><div className="min-w-0"><div className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]"><TimerReset className="h-3 w-3" />Routine</div><p className="mt-1.5 text-[12px] font-medium leading-snug text-[var(--text)]">{event.title}</p><p className="num mt-1 text-[9px] text-[var(--text-4)]">{event.metadata.schedule || "Schedule expression unavailable"}</p><p className="mt-2 truncate text-[9.5px] text-[var(--text-3)]">{metadata}</p><div className="mt-2 flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${event.status.toLowerCase() === "active" ? "bg-[var(--up)]" : "bg-[var(--text-4)]"}`} /><span className="text-[9px] capitalize text-[var(--text-4)]">{event.status || "unknown"}</span></div></div></div>;
}

function CalendarSkeleton() {
  return <div className="grid grid-cols-7">{Array.from({ length: 42 }, (_, index) => <div key={index} className="min-h-[112px] border-b border-r border-[var(--line)] p-2"><Skeleton className="h-5 w-5" />{index % 5 === 0 && <Skeleton className="mt-3 h-6 w-full" />}</div>)}</div>;
}
