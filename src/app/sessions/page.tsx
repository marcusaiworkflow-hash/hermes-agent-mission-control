"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, RefreshCw, Search, TerminalSquare } from "lucide-react";
import { EmptyState, Panel, Pill, Skeleton } from "@/components/ui/kit";
import { bridgeDuration, linkedEvents, requestDays, timestamp, type SessionEvent, type SessionRequest } from "@/lib/sessions";

const inputClass = "w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[12px] text-[var(--text-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]";
function label(value: string | null | undefined) { return value?.trim() ? value.replace(/_/g, " ") : "Unavailable"; }
function stamp(value: string | null) {
  const time = timestamp(value);
  return time === null ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(time);
}
function TimeValue({ value }: { value: string | null }) {
  const time = timestamp(value);
  return time === null ? <>Unavailable</> : <time dateTime={new Date(time).toISOString()}>{stamp(value)}</time>;
}
function duration(value: number | null) {
  if (value === null) return "Unavailable";
  if (value < 1000) return `${Math.round(value)} ms`;
  if (value < 60000) return `${(value / 1000).toFixed(1)} s`;
  return `${(value / 60000).toFixed(1)} min`;
}
function tone(status: string): "up" | "down" | "accent" | "warn" | "neutral" {
  if (status === "done") return "up";
  if (status === "failed") return "down";
  if (status === "running") return "accent";
  if (["awaiting_approval", "rejected"].includes(status)) return "warn";
  return "neutral";
}
async function fetchRows<T>(url: string, key: string, signal: AbortSignal): Promise<T[]> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]) });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data[key])) throw new Error("Unexpected API response");
  return data[key];
}

export default function SessionsPage() {
  const [requests, setRequests] = useState<SessionRequest[] | null>(null);
  const [events, setEvents] = useState<SessionEvent[] | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [eventError, setEventError] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [eventsAt, setEventsAt] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ status: "", kind: "", origin: "" });
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    const results = await Promise.allSettled([
      fetchRows<SessionRequest>("/api/hermes/requests?take=200", "requests", current.signal),
      fetchRows<SessionEvent>("/api/hermes/activity?take=100", "events", current.signal),
    ]);
    if (current.signal.aborted) return;
    const now = new Date().toISOString();
    if (results[0].status === "fulfilled") { setRequests(results[0].value); setLoadedAt(now); }
    if (results[1].status === "fulfilled") { setEvents(results[1].value); setEventsAt(now); }
    setError(results[0].status === "rejected");
    setEventError(results[1].status === "rejected");
    setBusy(false);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { void load(); });
    return () => { cancelAnimationFrame(frame); controller.current?.abort(); };
  }, [load]);

  const rows = useMemo(() => requests ?? [], [requests]);
  const days = useMemo(() => requestDays(rows), [rows]);
  const durations = rows.map(bridgeDuration).filter((value): value is number => value !== null);
  const average = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null;
  const filtered = rows.filter((row) => Object.entries(filters).every(([key, value]) => !value || row[key as keyof typeof filters] === value) &&
    (!query.trim() || [row.title, row.id].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase()))));
  const metric = (value: number) => requests === null ? "Unavailable" : String(value);
  const clear = () => { setQuery(""); setFilters({ status: "", kind: "", origin: "" }); };

  return <div className="relative z-10 w-full space-y-7 pb-16 pt-7">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="eyebrow mb-1.5">Hermes operations</div><h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[34px]">Sessions</h1>
        <p className="mt-1 text-[13px] text-[var(--text-2)]">Requests and executions, tracked through Hermes Bridge.</p>
        <p className="mt-2 text-[12px] text-[var(--text-3)]">Sessions v1 is read-only Bridge request and execution history · AgentRequest records, not native runtime sessions.</p></div>
      <button onClick={() => void load()} disabled={busy} className="btn-ghost flex items-center gap-2 self-start px-3.5 py-2 text-[12px] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />{busy ? "Loading…" : "Refresh"}</button>
    </header>

    {(error || eventError) && <div role="alert"><Panel className="flex items-start gap-2 p-4 text-[12px] text-[var(--warn)]"><AlertTriangle className="h-4 w-4 shrink-0" /><div>
      {error && <p>{requests === null ? "Request history is unavailable. Retry with Refresh." : "History refresh failed. Previously loaded requests remain visible and may be stale."}</p>}
      {eventError && <p>{events === null ? "Linked activity is unavailable. Request history can still be reviewed." : "Activity refresh failed. Linked events are from the earlier snapshot and may be stale."}</p>}
    </div></Panel></div>}

    <section aria-label="Request telemetry"><Panel className="overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <div className="min-w-0 border-b border-[var(--line)] p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-4"><div><div className="eyebrow">Loaded history window</div><h2 className="mt-1.5 text-[20px] font-semibold text-[var(--text)]">Request Activity</h2><p className="mt-1 text-[11.5px] text-[var(--text-3)]">Requests grouped by created day (UTC), including requests awaiting execution.</p></div><Activity className="h-5 w-5 shrink-0 text-[var(--accent)]" /></div>
          {busy && requests === null ? <Skeleton className="mt-5 h-44" /> : requests === null ? <p className="py-16 text-center text-[12px] text-[var(--text-3)]">Request activity unavailable</p> : <ActivityChart days={days} />}
        </div>
        <div className="p-5 sm:p-6"><div className="eyebrow">Operational snapshot</div><div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6">
          <Metric title="Requests loaded" value={metric(rows.length)} note="Latest 200 requests at most" />
          <Metric title="Running now" value={metric(rows.filter((row) => row.status === "running").length)} note="Stored running status at refresh" />
          <Metric title="Average Bridge duration" value={duration(average)} note={requests === null ? "Start / finish pairs unavailable" : `${durations.length} valid start / finish pairs`} />
          <Metric title="Failed requests" value={metric(rows.filter((row) => row.status === "failed").length)} note="Failed status in loaded history" />
        </div><p className="mt-6 text-[11px] leading-relaxed text-[var(--text-3)]">All metrics cover loaded requests, not lifetime totals. Filters below affect only the list.</p></div>
      </div>
      <div className="border-t border-[var(--line)] px-5 py-3 text-[11px] text-[var(--text-3)]" aria-live="polite">History refreshed: <TimeValue value={loadedAt} />. Snapshot only; use Refresh for current status.</div>
    </Panel></section>

    <Panel className="p-3 sm:p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(140px,0.5fr))_auto]">
      <label className="relative"><span className="sr-only">Search by request title or ID</span><Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-4)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search request title or ID" className={`${inputClass} pl-9`} /></label>
      {(["status", "kind", "origin"] as const).map((key) => <select key={key} aria-label={`Filter by ${key}`} value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })} className={inputClass}><option value="">All {key === "status" ? "statuses" : `${key}s`}</option>{[...new Set([...rows.map((row) => row[key]), filters[key]])].filter(Boolean).sort().map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>)}
      <button onClick={clear} className="btn-ghost px-3 py-2 text-[12px]">Clear filters</button>
    </div></Panel>

    <section aria-label="Request and execution history" aria-busy={busy}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><h2 className="text-[20px] font-semibold text-[var(--text)]">Request History</h2><span className="text-[11px] text-[var(--text-3)]">{requests === null ? "History unavailable" : `${filtered.length} matching · ${rows.length} loaded`}</span></div>
      {busy && requests === null ? <div className="space-y-3" role="status" aria-label="Loading request history"><Skeleton className="h-40" /><Skeleton className="h-40" /></div> : requests === null ? <Panel><EmptyState title="Request history unavailable" hint="Use Refresh to retry the requests API." /></Panel> : !filtered.length ? <Panel><EmptyState icon={<TerminalSquare className="h-6 w-6" />} title={rows.length ? "No requests match these filters" : "No request history recorded"} hint={rows.length ? "Change the search or clear filters to see loaded requests." : "Persisted Hermes Bridge requests will appear here when available."} /></Panel> : <div className="space-y-3">{filtered.map((row) => <RequestCard key={row.id} row={row} events={events} eventsAt={eventsAt} eventError={eventError} />)}</div>}
    </section>
    <p className="text-[11px] leading-relaxed text-[var(--text-4)]">Native session IDs, transcripts, models, message and tool counts, token usage, costs, executor identity, and workflow-run relationships are not captured by this view.</p>
  </div>;
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return <div className="min-w-0"><div className="eyebrow !text-[9px]">{title}</div><div className="num mt-2 break-words text-[20px] font-semibold text-[var(--text)]">{value}</div><p className="mt-1 text-[10.5px] text-[var(--text-3)]">{note}</p></div>;
}

function ActivityChart({ days }: { days: ReturnType<typeof requestDays> }) {
  if (!days.length) return <div className="mt-5 flex h-44 items-center justify-center rounded-lg border border-dashed border-[var(--line)] text-[12px] text-[var(--text-3)]">No valid created timestamps loaded.</div>;
  const max = Math.max(...days.map(({ count }) => count));
  return <div className="mt-5">
    <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3" tabIndex={0} aria-label="Daily request counts; scroll horizontally for more days">
      <div className="flex h-44 items-end gap-2" style={{ minWidth: Math.max(240, days.length * 48) }}>
        {days.map(({ day, count }) => <div key={day} role="img" aria-label={`${day} UTC: ${count} ${count === 1 ? "request" : "requests"}`} className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-1"><span aria-hidden="true" className="num text-[10px] text-[var(--text-2)]">{count}</span><div aria-hidden="true" className="w-full max-w-10 rounded-t bg-[var(--accent)] opacity-75" style={{ height: `${count / max * 70}%` }} title={`${day} UTC: ${count} requests`} /><span aria-hidden="true" className="text-[9px] text-[var(--text-3)]">{day.slice(5)}</span></div>)}
      </div>
    </div>
    <p className="mt-2 text-[10px] text-[var(--text-3)]">{days[0].day} – {days[days.length - 1].day} UTC · Only days with loaded records shown; gaps omitted.</p>
  </div>;
}

function Field({ title, value }: { title: string; value: ReactNode }) {
  return <div className="min-w-0"><dt className="text-[10px] text-[var(--text-4)]">{title}</dt><dd className="mt-1 break-words text-[11.5px] text-[var(--text-2)]">{value}</dd></div>;
}
function Preview({ value }: { value: string | null }) {
  const limit = 6000;
  return <><pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--text-2)]">{value?.trim() ? value.slice(0, limit) : "Unavailable"}</pre>{value && value.length > limit && <p className="mt-1 text-[10px] text-[var(--text-3)]">Preview truncated: showing {limit.toLocaleString()} of {value.length.toLocaleString()} stored characters.</p>}</>;
}
function RequestCard({ row, events, eventsAt, eventError }: { row: SessionRequest; events: SessionEvent[] | null; eventsAt: string | null; eventError: boolean }) {
  const linked = events === null ? null : linkedEvents(events, row.id);
  return <Panel className="overflow-hidden"><article className="p-4 sm:p-5">
    <div className="flex flex-wrap items-center gap-2"><Pill tone={tone(row.status)}>{label(row.status)}</Pill><span className="font-mono text-[10.5px] text-[var(--text-4)]" title={row.id}>{row.id.slice(0, 12)}</span></div>
    <h3 className="mt-3 break-words text-[14px] font-semibold text-[var(--text)]">{row.title || "Unavailable"}</h3>
    <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
      <Field title="Kind" value={label(row.kind)} /><Field title="Origin" value={label(row.origin)} /><Field title="Created" value={<TimeValue value={row.createdAt} />} /><Field title="Started" value={<TimeValue value={row.startedAt} />} /><Field title="Finished" value={<TimeValue value={row.finishedAt} />} /><Field title="Bridge duration" value={duration(bridgeDuration(row))} /><Field title="Linked events in loaded window" value={linked === null ? "Unavailable" : `${linked.length}${eventError ? " (stale)" : ""}`} />
      {row.hermesTaskId?.trim() && <Field title="Hermes task ID" value={row.hermesTaskId} />}
    </dl>
    <details className="mt-4 border-t border-[var(--line)] pt-3"><summary className="cursor-pointer text-[12px] text-[var(--accent)] focus-visible:outline-2">Output and linked activity</summary>
      <div className="mt-4 space-y-5"><dl><Field title="Full request ID" value={row.id} /></dl><div><h4 className="text-[12px] font-medium text-[var(--text)]">Stored result / output</h4><Preview value={row.result} /></div>
        {row.error && <div><h4 className="text-[12px] font-medium text-[var(--down)]">Stored error</h4><Preview value={row.error} /></div>}
        <div><h4 className="text-[12px] font-medium text-[var(--text)]">Explicitly linked AgentEvent timeline</h4><p className="mt-1 text-[11px] leading-relaxed text-[var(--text-3)]">Exact meta.requestId matches only, within the latest 100 loaded activity events. This is not complete lifetime event coverage; older linked events may be outside the loaded window. Activity refreshed: <TimeValue value={eventsAt} />{eventError ? " · Refresh unavailable." : "."}</p>
          {linked?.length ? <ol className="mt-3 space-y-3 border-l border-[var(--line)] pl-4">{linked.map((event) => <li key={event.id} className="min-w-0"><div className="text-[10px] text-[var(--text-4)]"><TimeValue value={event.createdAt} /> · {label(event.kind)} · {label(event.level)}</div><p className="mt-1 break-words text-[12px] text-[var(--text-2)]">{event.title || "Unavailable"}</p>{event.detail && <Preview value={event.detail} />}</li>)}</ol> : <p className="mt-3 text-[12px] text-[var(--text-3)]">{linked === null ? "Linked activity unavailable." : "No explicitly linked events in the latest 100 loaded activity events."}</p>}
        </div>
      </div>
    </details>
  </article></Panel>;
}
