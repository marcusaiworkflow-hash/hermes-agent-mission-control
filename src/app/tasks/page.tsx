"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, CircleDot, Clock3, RefreshCw, UserRound } from "lucide-react";
import { Panel, Pill, Skeleton, rise } from "@/components/ui/kit";

interface HermesTask { id: string; board: string; title: string; assignee: string | null; status: string; priority: number | null; result: string | null; updatedAt: string; syncedAt: string }
interface AgentRequest { id: string; title: string; status: string; result: string | null; error: string | null; hermesTaskId: string | null; createdAt: string; updatedAt: string }
type ColumnId = "todo" | "active" | "review" | "done";
type QuickFilter = "all" | "high" | "assigned" | ColumnId;
type Tone = "neutral" | "up" | "down" | "warn" | "accent";

const COLUMNS: Array<{ id: ColumnId; label: string; description: string; tone: Tone }> = [
  { id: "todo", label: "To Do", description: "Queued and ready", tone: "neutral" },
  { id: "active", label: "In Progress", description: "Currently executing", tone: "accent" },
  { id: "review", label: "Review", description: "Review or attention", tone: "warn" },
  { id: "done", label: "Done Today", description: "Completed work", tone: "up" },
];
const ACTIVE = ["running", "active", "inprogress", "doing", "working", "executing"];
const REVIEW = ["review", "approval", "awaitingapproval", "pendingreview", "blocked", "failed", "error", "stalled", "rejected"];
const BLOCKED = ["blocked", "failed", "error", "stalled", "rejected"];
const COMPLETE = ["done", "complete", "completed", "finished", "closed", "success", "succeeded"];

function normalized(value: string) { return value.toLowerCase().replace(/[\s_-]+/g, ""); }
function hasStatus(value: string, candidates: string[]) { const status = normalized(value); return candidates.some((candidate) => status.includes(candidate)); }
function columnFor(status: string): ColumnId {
  if (hasStatus(status, COMPLETE)) return "done";
  if (hasStatus(status, REVIEW)) return "review";
  if (hasStatus(status, ACTIVE)) return "active";
  return "todo";
}
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
function isToday(value: string) {
  const date = new Date(value); const now = new Date();
  return !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}
async function getJSON<T>(url: string): Promise<T> { const response = await fetch(url, { cache: "no-store" }); if (!response.ok) throw new Error(`Request failed (${response.status})`); return response.json() as Promise<T>; }

export default function TasksPage() {
  const [tasks, setTasks] = useState<HermesTask[]>([]);
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
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
  const counts = useMemo(() => {
    const completed = tasks.filter((task) => columnFor(task.status) === "done");
    return {
      active: tasks.filter((task) => columnFor(task.status) === "active").length,
      blocked: tasks.filter((task) => hasStatus(task.status, BLOCKED)).length,
      completed: completed.length,
      doneToday: completed.filter((task) => isToday(task.updatedAt)).length,
      high: tasks.filter((task) => task.priority != null && task.priority >= 80).length,
      assignees: assignees.length,
      approvals: requests.filter((request) => request.status === "awaiting_approval").length,
    };
  }, [assignees.length, requests, tasks]);
  const completionRate = tasks.length ? Math.round((counts.completed / tasks.length) * 100) : 0;
  const pathTasks = useMemo(() => [...tasks].filter((task) => columnFor(task.status) !== "done").sort((a, b) => {
    const order: Record<ColumnId, number> = { active: 0, review: 1, todo: 2, done: 3 };
    return order[columnFor(a.status)] - order[columnFor(b.status)] || (b.priority ?? -1) - (a.priority ?? -1);
  }).slice(0, 3), [tasks]);
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (["todo", "active", "review", "done"].includes(quickFilter) && columnFor(task.status) !== quickFilter) return false;
    if (quickFilter === "high" && (task.priority == null || task.priority < 80)) return false;
    if (quickFilter === "assigned" && !task.assignee?.trim()) return false;
    if (assigneeFilter !== "all" && task.assignee?.trim() !== assigneeFilter) return false;
    return boardFilter === "all" || task.board === boardFilter;
  }), [assigneeFilter, boardFilter, quickFilter, tasks]);
  const grouped = useMemo(() => {
    const groups: Record<ColumnId, HermesTask[]> = { todo: [], active: [], review: [], done: [] };
    for (const task of visibleTasks) groups[columnFor(task.status)].push(task);
    for (const column of COLUMNS) groups[column.id].sort((a, b) => (b.priority ?? -1) - (a.priority ?? -1));
    return groups;
  }, [visibleTasks]);
  const filtersActive = quickFilter !== "all" || assigneeFilter !== "all" || boardFilter !== "all";
  const clearFilters = () => { setQuickFilter("all"); setAssigneeFilter("all"); setBoardFilter("all"); };

  return <div className="relative z-10 w-full pb-16 pt-1">
    <header className="hq-rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" style={rise(0)}>
      <div><div className="eyebrow mb-1.5">Hermes operations</div><h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[34px]">Tasks</h1><p className="mt-1 max-w-xl text-[12.5px] text-[var(--text-2)]">Plan, track, and review real work mirrored from Hermes.</p></div>
      <div className="flex items-center gap-3"><span className="num text-[10.5px] text-[var(--text-3)]">Synced {timeAgo(lastSync)}</span><button type="button" onClick={() => load(true)} disabled={refreshing} className="btn-ghost inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />Refresh</button></div>
    </header>

    <section className="hq-rise mt-5" style={rise(1)} aria-labelledby="day-plan-title">
      <Panel className="overflow-hidden !border-[color-mix(in_srgb,var(--accent)_25%,var(--line))] !bg-[linear-gradient(115deg,color-mix(in_srgb,var(--accent)_7%,var(--surface-1)),var(--surface-1)_46%,color-mix(in_srgb,#9b8cff_5%,var(--surface-1)))] p-0">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 sm:px-5"><div className="flex items-center gap-2.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" /><h2 id="day-plan-title" className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text)]">The Day Plan</h2></div><span className="text-[10.5px] text-[var(--text-3)]">Live operational snapshot</span></div>
        <div className="grid lg:grid-cols-[0.82fr_1.55fr_0.9fr]">
          <div className="border-b border-[var(--line)] p-5 lg:border-b-0 lg:border-r">
            <p className="text-[12px] font-medium text-[var(--text-2)]">Due Today</p><div className="mt-1 flex items-end gap-2"><span className="num text-[54px] font-semibold leading-none tracking-[-0.06em] text-[var(--text)]">{tasks.length === 0 ? 0 : "—"}</span><span className="mb-1.5 text-[10px] leading-tight text-[var(--text-4)]">{tasks.length === 0 ? "tasks" : "due dates not supplied"}</span></div>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--line)] pt-4"><MiniStat label="Blocked" value={counts.blocked} tone={counts.blocked ? "down" : "neutral"} /><MiniStat label="High priority" value={counts.high} tone={counts.high ? "warn" : "neutral"} /><MiniStat label="Active owners" value={counts.assignees} /><MiniStat label="Approvals" value={counts.approvals} tone={counts.approvals ? "warn" : "neutral"} /></div>
          </div>
          <div className="border-b border-[var(--line)] p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[13px] font-semibold text-[var(--text)]">Today&apos;s Path</p><p className="mt-1 text-[10.5px] text-[var(--text-3)]">{counts.completed} completed · {Math.max(0, tasks.length - counts.completed)} remaining</p></div><Pill tone={counts.active ? "accent" : "neutral"} className="!px-2 !py-0.5 !text-[9px]">{counts.active} active</Pill></div>
            <div className="mt-4 space-y-1.5">{loading ? <><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></> : pathTasks.length ? pathTasks.map((task, index) => <PathItem key={task.id} task={task} index={index} />) : <div className="flex min-h-[126px] items-center justify-center rounded-[var(--r-sm)] border border-dashed border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-2)_45%,transparent)] px-5 text-center"><div><CheckCircle2 className="mx-auto h-4 w-4 text-[var(--text-4)]" /><p className="mt-2 text-[11px] font-medium text-[var(--text-2)]">No active path</p><p className="mt-1 text-[10.5px] text-[var(--text-4)]">Synced work will be sequenced here by state and priority.</p></div></div>}</div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-[var(--text)]">Workload cleared</p><span className="num text-[18px] font-semibold text-[var(--accent)]">{completionRate}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),#9b8cff)] transition-[width] duration-500" style={{ width: `${completionRate}%` }} /></div>
            <div className="mt-5 space-y-3"><DistributionRow label="Remaining" value={Math.max(0, tasks.length - counts.completed)} total={tasks.length} color="var(--accent)" /><DistributionRow label="In progress" value={counts.active} total={tasks.length} color="#9b8cff" /><DistributionRow label="Done today" value={counts.doneToday} total={tasks.length} color="var(--up)" /></div><p className="mt-5 border-t border-[var(--line)] pt-3 text-[10px] leading-relaxed text-[var(--text-4)]">Current-state distribution only. No historical trend is inferred.</p>
          </div>
        </div>
      </Panel>
    </section>

    <section className="hq-rise mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" style={rise(2)} aria-label="Task filters">
      <div className="flex flex-wrap items-center gap-1.5"><FilterChip label="All" count={tasks.length} active={quickFilter === "all"} onClick={() => setQuickFilter("all")} /><FilterChip label="To Do" count={tasks.filter((task) => columnFor(task.status) === "todo").length} active={quickFilter === "todo"} onClick={() => setQuickFilter("todo")} /><FilterChip label="In Progress" count={counts.active} active={quickFilter === "active"} onClick={() => setQuickFilter("active")} /><FilterChip label="Review" count={tasks.filter((task) => columnFor(task.status) === "review").length} active={quickFilter === "review"} onClick={() => setQuickFilter("review")} /><FilterChip label="High Priority" count={counts.high} active={quickFilter === "high"} onClick={() => setQuickFilter("high")} />{assignees.length > 0 && <FilterChip label="Agent-owned" count={tasks.filter((task) => Boolean(task.assignee?.trim())).length} active={quickFilter === "assigned"} onClick={() => setQuickFilter("assigned")} />}</div>
      <div className="flex flex-wrap items-center gap-2">{assignees.length > 1 && <CompactSelect label="Assignee" value={assigneeFilter} onChange={setAssigneeFilter} options={[{ value: "all", label: "Every assignee" }, ...assignees.map((name) => ({ value: name, label: name }))]} />}{boards.length > 1 && <CompactSelect label="Board" value={boardFilter} onChange={setBoardFilter} options={[{ value: "all", label: "Every board" }, ...boards.map((board) => ({ value: board, label: board }))]} />}<span className="num px-1 text-[10px] text-[var(--text-4)]">{visibleTasks.length} shown</span>{filtersActive && <button type="button" onClick={clearFilters} className="text-[10.5px] font-medium text-[var(--accent)] hover:text-[var(--text)]">Clear</button>}<button type="button" disabled title="Task creation is not supported by the current Hermes API" className="inline-flex cursor-not-allowed items-center rounded-full border border-[var(--line)] px-3 py-1.5 text-[10.5px] text-[var(--text-4)] opacity-70">New task · later</button></div>
    </section>

    <section className="mt-4" aria-label="Operational task board">
      {error && <div className="mb-3 flex items-center gap-3 rounded-[var(--r-sm)] border border-[color-mix(in_srgb,var(--down)_30%,var(--line))] bg-[color-mix(in_srgb,var(--down)_7%,var(--surface-1))] px-4 py-3 text-[11px] text-[var(--text-2)]"><AlertTriangle className="h-4 w-4 shrink-0 text-[var(--down)]" /><span><strong className="font-medium text-[var(--text)]">Tasks could not be loaded.</strong> {error}. No cached or fabricated data is shown.</span><button type="button" onClick={() => load()} className="ml-auto shrink-0 font-medium text-[var(--accent)]">Try again</button></div>}
      {loading ? <BoardSkeleton /> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{COLUMNS.map((column, index) => <TaskColumn key={column.id} column={column} tasks={error ? [] : grouped[column.id]} requestsByTask={requestsByTask} filtersActive={filtersActive} delay={index + 3} />)}</div>}
    </section>
  </div>;
}

function MiniStat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: Tone }) { const color = tone === "neutral" ? "var(--text)" : `var(--${tone})`; return <div><p className="num text-[16px] font-semibold" style={{ color }}>{value}</p><p className="mt-0.5 text-[9.5px] text-[var(--text-4)]">{label}</p></div>; }
function PathItem({ task, index }: { task: HermesTask; index: number }) {
  const column = COLUMNS.find((item) => item.id === columnFor(task.status)) ?? COLUMNS[0];
  return <div className="group flex items-center gap-3 rounded-[8px] border border-transparent px-2 py-2 transition-colors hover:border-[var(--line)] hover:bg-[var(--surface-2)]"><span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-[9px] text-[var(--text-3)]">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-medium text-[var(--text)]">{task.title}</p><p className="mt-0.5 truncate text-[9.5px] text-[var(--text-4)]">{task.assignee || task.board || "Unassigned"} · updated {timeAgo(task.updatedAt)}</p></div>{task.priority != null && <span className="num text-[9px] text-[var(--text-3)]">P{task.priority}</span>}<span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: column.tone === "neutral" ? "var(--text-3)" : `var(--${column.tone})` }} /></div>;
}
function DistributionRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) { const width = total ? Math.max(value ? 5 : 0, Math.round((value / total) * 100)) : 0; return <div><div className="mb-1.5 flex items-center justify-between text-[10px]"><span className="text-[var(--text-3)]">{label}</span><span className="num text-[var(--text-2)]">{value}</span></div><div className="h-1 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} /></div></div>; }
function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) { return <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-medium transition-colors ${active ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-1))] text-[var(--text)]" : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-3)] hover:border-[var(--line-strong)] hover:text-[var(--text-2)]"}`}><span>{label}</span><span className="num text-[9px] opacity-70">{count}</span></button>; }
function CompactSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <label className="relative"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="appearance-none rounded-full border border-[var(--line)] bg-[var(--surface-1)] py-1.5 pl-3 pr-7 text-[10.5px] text-[var(--text-3)] outline-none hover:border-[var(--line-strong)] focus:border-[var(--accent)]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-[var(--text-4)]" /></label>; }
function TaskColumn({ column, tasks, requestsByTask, filtersActive, delay }: { column: (typeof COLUMNS)[number]; tasks: HermesTask[]; requestsByTask: Map<string, AgentRequest>; filtersActive: boolean; delay: number }) {
  const color = column.tone === "neutral" ? "var(--text-3)" : `var(--${column.tone})`;
  return <div className="hq-rise min-w-0" style={rise(delay)}><div className="mb-2 px-1"><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} /><h2 className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[var(--text-2)]">{column.label}</h2><span className="num ml-auto rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[9.5px] text-[var(--text-3)]">{tasks.length}</span></div><div className="mt-2 flex items-center gap-2"><span className="h-px flex-1" style={{ background: `color-mix(in srgb, ${color} 42%, var(--line))` }} /><span className="text-[9px] text-[var(--text-4)]">{column.description}</span></div></div><div className="min-h-[280px] space-y-2 rounded-[var(--r-lg)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_48%,transparent)] p-2">{tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} request={requestsByTask.get(task.id)} tone={column.tone} />) : <ColumnEmpty column={column} filtered={filtersActive} />}</div></div>;
}
function ColumnEmpty({ column, filtered }: { column: (typeof COLUMNS)[number]; filtered: boolean }) { return <div className="flex min-h-[260px] items-center justify-center px-5 text-center"><div><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-2)]">{column.id === "done" ? <Check className="h-3 w-3 text-[var(--text-4)]" /> : <CircleDot className="h-3 w-3 text-[var(--text-4)]" />}</span><p className="mt-2.5 text-[10.5px] font-medium text-[var(--text-3)]">{filtered ? "No matching tasks" : `No ${column.label.toLowerCase()} tasks`}</p><p className="mt-1 text-[9.5px] leading-relaxed text-[var(--text-4)]">{filtered ? "Try another filter." : "Synced Hermes work will appear here."}</p></div></div>; }
function TaskCard({ task, request, tone }: { task: HermesTask; request?: AgentRequest; tone: Tone }) {
  const color = tone === "neutral" ? "var(--text-3)" : `var(--${tone})`; const context = request?.error || request?.result || task.result; const reqTone = request ? requestTone(request.status) : "neutral";
  return <Panel className="group overflow-hidden p-3 transition-colors hover:!border-[var(--line-strong)]" style={{ borderTop: `2px solid color-mix(in srgb, ${color} 52%, transparent)` }}><div className="flex items-center gap-2"><span className="text-[9px] font-medium uppercase tracking-[0.08em]" style={{ color }}>{labelize(task.status)}</span>{task.priority != null && <Pill tone={priorityTone(task.priority)} className="num ml-auto !px-1.5 !py-0.5 !text-[8.5px]">P{task.priority}</Pill>}</div><h3 className="mt-2 text-[12.5px] font-medium leading-snug text-[var(--text)]">{task.title}</h3>{context && <p className={`mt-1.5 line-clamp-2 text-[10.5px] leading-relaxed ${request?.error ? "text-[var(--down)]" : "text-[var(--text-3)]"}`}>{context}</p>}<div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-[var(--line)] pt-2 text-[9.5px] text-[var(--text-4)]">{task.assignee && <span className="flex min-w-0 items-center gap-1"><UserRound className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{task.assignee}</span></span>}<span className="flex items-center gap-1"><Clock3 className="h-2.5 w-2.5" />{timeAgo(task.updatedAt || task.syncedAt)}</span>{task.board && <span className="max-w-[90px] truncate rounded bg-[var(--surface-2)] px-1.5 py-0.5">{task.board}</span>}</div>{request && <div className="mt-2 flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5"><CircleDot className="h-2.5 w-2.5 shrink-0" style={{ color: reqTone === "neutral" ? "var(--text-3)" : `var(--${reqTone})` }} /><span className="text-[9px] text-[var(--text-4)]">Request</span><span className="ml-auto text-[9px] font-medium text-[var(--text-2)]">{labelize(request.status)}</span><ArrowRight className="h-2.5 w-2.5 text-[var(--text-4)]" /></div>}</Panel>;
}
function BoardSkeleton() { return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{COLUMNS.map((column) => <div key={column.id}><Skeleton className="mb-3 h-4 w-24" /><Panel className="space-y-2 p-2"><Skeleton className="h-28 w-full" /><Skeleton className="h-24 w-full" /></Panel></div>)}</div>; }
