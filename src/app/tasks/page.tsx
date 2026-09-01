"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, CircleDot, Clock3, Inbox, LayoutGrid, RefreshCw, UserRound, Zap } from "lucide-react";
import { EmptyState, Panel, Pill, Skeleton, rise } from "@/components/ui/kit";

interface HermesTask { id: string; board: string; title: string; assignee: string | null; status: string; priority: number | null; result: string | null; updatedAt: string; syncedAt: string }
interface AgentRequest { id: string; title: string; status: string; result: string | null; error: string | null; hermesTaskId: string | null; createdAt: string; updatedAt: string }
type ColumnId = "queue" | "active" | "review" | "blocked" | "complete";
type PriorityFilter = "all" | "high" | "medium" | "low" | "unset";
type Tone = "neutral" | "up" | "down" | "warn" | "accent";

const COLUMNS: Array<{ id: ColumnId; label: string; description: string; tone: Tone }> = [
  { id: "queue", label: "Queue", description: "Triage, ready, and queued work", tone: "neutral" },
  { id: "active", label: "Active", description: "Work currently in execution", tone: "accent" },
  { id: "review", label: "Review", description: "Waiting for review or approval", tone: "warn" },
  { id: "blocked", label: "Blocked", description: "Failed or needs attention", tone: "down" },
  { id: "complete", label: "Complete", description: "Finished operational work", tone: "up" },
];
const ACTIVE = ["running", "active", "inprogress", "doing", "working", "executing"];
const REVIEW = ["review", "approval", "awaitingapproval", "pendingreview"];
const BLOCKED = ["blocked", "failed", "error", "stalled", "rejected"];
const COMPLETE = ["done", "complete", "completed", "finished", "closed", "success", "succeeded"];

function normalized(value: string) { return value.toLowerCase().replace(/[\s_-]+/g, ""); }
function hasStatus(value: string, candidates: string[]) { const status = normalized(value); return candidates.some((candidate) => status.includes(candidate)); }
function columnFor(status: string): ColumnId {
  if (hasStatus(status, COMPLETE)) return "complete";
  if (hasStatus(status, BLOCKED)) return "blocked";
  if (hasStatus(status, REVIEW)) return "review";
  if (hasStatus(status, ACTIVE)) return "active";
  return "queue";
}
function priorityBand(priority: number | null): Exclude<PriorityFilter, "all"> { return priority == null ? "unset" : priority >= 80 ? "high" : priority >= 40 ? "medium" : "low"; }
function priorityTone(priority: number | null): Tone { return priority == null ? "neutral" : priority >= 80 ? "down" : priority >= 40 ? "warn" : "neutral"; }
function requestTone(status: string): Tone {
  const value = normalized(status);
  if (value.includes("failed") || value.includes("rejected")) return "down";
  if (value.includes("awaitingapproval")) return "warn";
  if (value.includes("done")) return "up";
  if (value.includes("running") || value.includes("approved")) return "accent";
  return "neutral";
}
function labelize(value: string) { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function timeAgo(value: string | null) {
  if (!value) return "—";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60); return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}
async function getJSON<T>(url: string): Promise<T> { const response = await fetch(url, { cache: "no-store" }); if (!response.ok) throw new Error(`Request failed (${response.status})`); return response.json() as Promise<T>; }

export default function TasksPage() {
  const [tasks, setTasks] = useState<HermesTask[]>([]);
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ColumnId | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [taskData, requestData] = await Promise.all([
        getJSON<{ tasks: HermesTask[]; lastSync: string | null }>("/api/hermes/tasks"),
        getJSON<{ requests: AgentRequest[] }>("/api/hermes/requests?take=200").catch(() => ({ requests: [] })),
      ]);
      setTasks(taskData.tasks ?? []); setRequests(requestData.requests ?? []); setLastSync(taskData.lastSync ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load operational tasks."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const assignees = useMemo(() => Array.from(new Set(tasks.map((task) => task.assignee?.trim()).filter((name): name is string => Boolean(name)))).sort(), [tasks]);
  const boards = useMemo(() => Array.from(new Set(tasks.map((task) => task.board?.trim()).filter(Boolean))).sort(), [tasks]);
  const requestsByTask = useMemo(() => { const map = new Map<string, AgentRequest>(); for (const request of requests) if (request.hermesTaskId && !map.has(request.hermesTaskId)) map.set(request.hermesTaskId, request); return map; }, [requests]);
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (statusFilter !== "all" && columnFor(task.status) !== statusFilter) return false;
    if (priorityFilter !== "all" && priorityBand(task.priority) !== priorityFilter) return false;
    if (assigneeFilter !== "all" && task.assignee?.trim() !== assigneeFilter) return false;
    return boardFilter === "all" || task.board === boardFilter;
  }), [assigneeFilter, boardFilter, priorityFilter, statusFilter, tasks]);
  const grouped = useMemo(() => {
    const groups: Record<ColumnId, HermesTask[]> = { queue: [], active: [], review: [], blocked: [], complete: [] };
    for (const task of visibleTasks) groups[columnFor(task.status)].push(task);
    for (const column of COLUMNS) groups[column.id].sort((a, b) => (b.priority ?? -1) - (a.priority ?? -1));
    return groups;
  }, [visibleTasks]);
  const counts = useMemo(() => ({
    active: tasks.filter((task) => columnFor(task.status) === "active").length,
    complete: tasks.filter((task) => columnFor(task.status) === "complete").length,
    attention: tasks.filter((task) => ["review", "blocked"].includes(columnFor(task.status))).length,
    approvals: requests.filter((request) => request.status === "awaiting_approval").length,
  }), [requests, tasks]);
  const filtersActive = statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all" || boardFilter !== "all";
  const clearFilters = () => { setStatusFilter("all"); setPriorityFilter("all"); setAssigneeFilter("all"); setBoardFilter("all"); };

  return <div className="relative z-10 w-full pb-16 pt-2">
    <header className="hq-rise flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" style={rise(0)}>
      <div><div className="eyebrow mb-2">Hermes operations</div><h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[34px]">Tasks</h1><p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--text-2)]">Real work mirrored from Hermes, organized by execution state and operational priority.</p></div>
      <div className="flex items-center gap-3"><span className="num text-[11px] text-[var(--text-3)]">Synced {timeAgo(lastSync)}</span><button type="button" onClick={() => load(true)} disabled={refreshing} className="btn-ghost inline-flex items-center gap-2 px-3.5 py-2 text-[12px] font-medium disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />Refresh</button></div>
    </header>

    <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Task summary">
      <SummaryCard label="All work" value={tasks.length} icon={<LayoutGrid />} delay={1} />
      <SummaryCard label="Active now" value={counts.active} icon={<Zap />} tone="accent" delay={2} />
      <SummaryCard label="Completed" value={counts.complete} icon={<CheckCircle2 />} tone="up" delay={3} />
      <SummaryCard label="Needs attention" value={counts.attention + counts.approvals} detail={counts.approvals ? `${counts.approvals} approval${counts.approvals === 1 ? "" : "s"}` : undefined} icon={<AlertTriangle />} tone={counts.attention + counts.approvals ? "warn" : "neutral"} delay={4} />
    </section>

    <section className="hq-rise mt-6" style={rise(5)} aria-label="Task filters"><Panel className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <FilterSelect label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as ColumnId | "all")} options={[{ value: "all", label: "All statuses" }, ...COLUMNS.map((column) => ({ value: column.id, label: column.label }))]} />
      <FilterSelect label="Priority" value={priorityFilter} onChange={(value) => setPriorityFilter(value as PriorityFilter)} options={[{ value: "all", label: "All priorities" }, { value: "high", label: "High · P80+" }, { value: "medium", label: "Medium · P40–79" }, { value: "low", label: "Low · below P40" }, { value: "unset", label: "No priority" }]} />
      {assignees.length > 0 && <FilterSelect label="Assignee" value={assigneeFilter} onChange={setAssigneeFilter} options={[{ value: "all", label: "All assignees" }, ...assignees.map((name) => ({ value: name, label: name }))]} />}
      {boards.length > 1 && <FilterSelect label="Board" value={boardFilter} onChange={setBoardFilter} options={[{ value: "all", label: "All boards" }, ...boards.map((board) => ({ value: board, label: board }))]} />}
      <div className="flex items-center gap-3 sm:ml-auto"><span className="num text-[11px] text-[var(--text-3)]">{visibleTasks.length} shown</span>{filtersActive && <button type="button" onClick={clearFilters} className="text-[12px] font-medium text-[var(--accent)] hover:text-[var(--text)]">Clear filters</button>}</div>
    </Panel></section>

    <section className="mt-5" aria-label="Operational task board">
      {loading ? <BoardSkeleton /> : error ? <Panel className="p-2"><EmptyState icon={<AlertTriangle className="h-6 w-6 text-[var(--down)]" />} title="Tasks could not be loaded" hint={`${error}. No cached or fabricated task data is being shown.`} action={<button type="button" onClick={() => load()} className="btn-ghost px-4 py-2 text-[12px] font-medium">Try again</button>} /></Panel>
      : tasks.length === 0 ? <Panel className="p-2"><EmptyState icon={<Inbox className="h-7 w-7" />} title="No Hermes tasks are currently synced" hint="When Hermes creates or mirrors operational work, it will appear here with its real status, priority, assignee, and execution result." /></Panel>
      : visibleTasks.length === 0 ? <Panel className="p-2"><EmptyState icon={<LayoutGrid className="h-6 w-6" />} title="No tasks match these filters" hint="Clear or adjust the filters to return to the full operational board." action={<button type="button" onClick={clearFilters} className="btn-ghost px-4 py-2 text-[12px] font-medium">Clear filters</button>} /></Panel>
      : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{COLUMNS.map((column, index) => <TaskColumn key={column.id} column={column} tasks={grouped[column.id]} requestsByTask={requestsByTask} delay={index + 6} />)}</div>}
    </section>
  </div>;
}

function SummaryCard({ label, value, detail, icon, tone = "neutral", delay }: { label: string; value: number; detail?: string; icon: React.ReactNode; tone?: Tone; delay: number }) {
  const color = tone === "neutral" ? "var(--text-3)" : `var(--${tone})`;
  return <Panel className="hq-rise p-4" style={rise(delay)}><div className="flex items-start justify-between gap-3"><div><p className="eyebrow !text-[9.5px]">{label}</p><p className="num mt-2 text-[25px] font-semibold tracking-[-0.04em] text-[var(--text)]">{value}</p>{detail && <p className="mt-1 text-[10.5px] text-[var(--text-3)]">{detail}</p>}</div><span className="[&>svg]:h-4 [&>svg]:w-4" style={{ color }}>{icon}</span></div></Panel>;
}
function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="relative min-w-0 sm:min-w-[150px]"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface-1)] py-2 pl-3 pr-8 text-[12px] text-[var(--text-2)] outline-none transition-colors hover:border-[var(--line-strong)] focus:border-[var(--accent)]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-3)]" /></label>;
}
function TaskColumn({ column, tasks, requestsByTask, delay }: { column: (typeof COLUMNS)[number]; tasks: HermesTask[]; requestsByTask: Map<string, AgentRequest>; delay: number }) {
  const color = column.tone === "neutral" ? "var(--text-3)" : `var(--${column.tone})`;
  return <div className="hq-rise min-w-0" style={rise(delay)}><div className="mb-2.5 flex items-start justify-between gap-2 px-1"><div><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} /><h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-2)]">{column.label}</h2></div><p className="mt-1 text-[10.5px] leading-snug text-[var(--text-4)]">{column.description}</p></div><span className="num text-[11px] text-[var(--text-3)]">{tasks.length}</span></div><div className="min-h-[118px] space-y-2.5 rounded-[var(--r-lg)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_55%,transparent)] p-2.5">{tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} request={requestsByTask.get(task.id)} tone={column.tone} />) : <p className="px-2 py-8 text-center text-[11px] text-[var(--text-4)]">No {column.label.toLowerCase()} tasks</p>}</div></div>;
}
function TaskCard({ task, request, tone }: { task: HermesTask; request?: AgentRequest; tone: Tone }) {
  const color = tone === "neutral" ? "var(--text-3)" : `var(--${tone})`; const context = request?.error || request?.result || task.result; const reqTone = request ? requestTone(request.status) : "neutral";
  return <Panel className="overflow-hidden p-3.5" style={{ borderLeft: `2px solid color-mix(in srgb, ${color} 58%, transparent)` }}><div className="flex items-start justify-between gap-2"><Pill tone={tone} className="!px-2 !py-0.5 !text-[9.5px]">{labelize(task.status)}</Pill>{task.priority != null && <Pill tone={priorityTone(task.priority)} className="num !px-2 !py-0.5 !text-[9.5px]">P{task.priority}</Pill>}</div><h3 className="mt-3 text-[13px] font-medium leading-snug text-[var(--text)]">{task.title}</h3>{context && <p className={`mt-2 line-clamp-3 text-[11.5px] leading-relaxed ${request?.error ? "text-[var(--down)]" : "text-[var(--text-2)]"}`}>{context}</p>}<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--line)] pt-2.5 text-[10.5px] text-[var(--text-3)]">{task.assignee && <span className="flex min-w-0 items-center gap-1"><UserRound className="h-3 w-3 shrink-0" /><span className="truncate">{task.assignee}</span></span>}<span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{timeAgo(task.updatedAt || task.syncedAt)}</span>{task.board && task.board !== "default" && <span className="truncate">{task.board}</span>}</div>{request && <div className="mt-2.5 flex items-center gap-1.5 rounded-[7px] border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2"><CircleDot className="h-3 w-3 shrink-0" style={{ color: reqTone === "neutral" ? "var(--text-3)" : `var(--${reqTone})` }} /><span className="text-[10.5px] text-[var(--text-3)]">Request</span><span className="ml-auto text-[10.5px] font-medium text-[var(--text-2)]">{labelize(request.status)}</span></div>}</Panel>;
}
function BoardSkeleton() { return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{COLUMNS.map((column) => <div key={column.id}><Skeleton className="mb-3 h-4 w-24" /><Panel className="space-y-2.5 p-2.5"><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /></Panel></div>)}</div>; }
