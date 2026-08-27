"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  Activity, ArrowUpRight, Bot, CalendarClock, CheckCircle2, ChevronRight,
  CircleAlert, Radio, Server, Twitter, Youtube,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Sparkline } from "@/components/sparkline";
import { HermesBriefing } from "@/components/hermes-briefing";
import { ApprovalInbox } from "@/components/approval-inbox";
import { EmptyState, Eyebrow, Panel, Pill, SectionHeader } from "@/components/ui/kit";

// ── Types ─────────────────────────────────────────────────
interface HLPosition {
  asset: string; direction: string; unrealizedPnl: number;
  unrealizedPnlPct: number; leverage: number; stopLoss?: number; takeProfit?: number;
}
interface Tweet { id: string; text: string; views: number; engRate: number; postedAt: string | null; tweetUrl: string | null }
interface Video  { title: string; thumbnail: string; url: string; publishedAt: string }
interface Draft  { id: string; text: string }
interface YTIdea { title: string; hook: string }
interface BuildIdea { title: string; description: string; effort: string }
interface KanbanTask { id: string; title: string; assignee: string; status: string; priority: number }
interface HermesKanban { board: string; slug: string; total: number; counts: Record<string, number>; tasks: KanbanTask[] }
interface ScoreComponent { score: number; weight?: number; label: string; detail?: string }
interface ScoreData { score: number; grade: string; label: string; color: string; period?: string; components: Record<string, ScoreComponent> }
interface HermesHealth {
  online: boolean;
  gateway: string;
  detail?: string;
  lastSeen: string | null;
}

interface ActivityEvent {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  agent: string | null;
  level: string;
  meta: unknown;
  createdAt: string;
}

interface AgentRequestItem {
  id: string;
  origin: string;
  kind: string;
  title: string;
  status: string;
  sideEffecting: boolean;
  result: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface CronJob {
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
}
interface HermesTask {
  id: string;
  board: string;
  title: string;
  assignee: string | null;
  status: string;
  priority: number | null;
  result: string | null;
  updatedAt: string;
  syncedAt: string;
}
interface HomeData {
  xFollowers: number; xGoal: number; xHandle: string;
  topTweets: Tweet[]; topTweet: Tweet | null; xViewsThisWeek: number;
  totalTweets: number; daysSincePost: number;
  bestPostingDay: string; bestPostingHourStr: string;
  topSageDrafts: Draft[];
  topYoutubeIdeas: YTIdea[];
  topBuildIdeas: BuildIdea[];
  topVideo: Video | null; latestVideo: Video | null;
  ytSubscribers: number; ytGoal: number;
  polyBalance: number; polyWinRate: number; polyTodayPnl: number; polyAllTimePnl: number;
  hlBalance: number; hlPosition: HLPosition | null; hlTodayPnl: number; hlAllTimePnl: number;
  allTimePnl: number; todayPnl: number;
  hermesKanban: HermesKanban;
  xViewsTrend: number[];
  snapshots: { d: string; xf: number; yt: number; pnl: number }[];
}

const EMPTY: HomeData = {
  xFollowers: 0, xGoal: 100000, xHandle: "yourhandle",
  topTweets: [], topTweet: null, xViewsThisWeek: 0, totalTweets: 0,
  daysSincePost: 999, bestPostingDay: "—", bestPostingHourStr: "—",
  topSageDrafts: [], topYoutubeIdeas: [], topBuildIdeas: [],
  topVideo: null, latestVideo: null, ytSubscribers: 0, ytGoal: 20000,
  polyBalance: 0, polyWinRate: 0, polyTodayPnl: 0, polyAllTimePnl: 0,
  hlBalance: 0, hlPosition: null, hlTodayPnl: 0, hlAllTimePnl: 0,
  allTimePnl: 0, todayPnl: 0,
  hermesKanban: { board: "Hermes 24/7 Assistant", slug: "hermes-24-7-assistant", total: 0, counts: {}, tasks: [] },
  xViewsTrend: [], snapshots: [],
};

// ── Animated counter ──────────────────────────────────────
function useCountUp(target: number, duration = 1400, enabled = true) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!enabled || target === 0 || reduce) { setVal(target); return; }
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(target * ease));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, enabled]);
  return val;
}

// ── Helpers ───────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) {
    const k = Math.round(n / 1_000);
    if (k >= 1000) return (n / 1_000_000).toFixed(1) + "M";
    return k + "K";
  }
  return n.toString();
}
function fmtExact(n: number) { return n.toLocaleString("en-US"); }
function fmtUsd(n: number, alwaysSign = false) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = n >= 0 ? (alwaysSign ? "+" : "") : "-";
  return `${sign}$${abs}`;
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  const hrs  = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hrs  > 0) return `${hrs}h ago`;
  return "just now";
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Still up";
}

// Local-dev preview only — never runs in production builds. Lets the full
// card structure (delta + sparkline) show before real snapshot history exists.
const DEV_PREVIEW = process.env.NODE_ENV !== "production";
function sampleSeries(current: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const ramp = 0.82 + (0.18 * i) / (n - 1);
    const wobble = 1 + Math.sin(i * 1.3) * 0.03;
    return Math.max(0, Math.round(current * ramp * wobble));
  });
}
type Snap = { d: string; xf: number; yt: number; pnl: number };
function snapDelta(snaps: Snap[], key: "xf" | "yt" | "pnl") {
  const series = snaps.map(s => s[key]);
  if (snaps.length < 2) return { delta: null as number | null, deltaPct: null as number | null, label: undefined as string | undefined, series };
  const first = snaps[0][key];
  const last = snaps[snaps.length - 1][key];
  const delta = last - first;
  const deltaPct = first !== 0 ? (delta / Math.abs(first)) * 100 : 0;
  return { delta, deltaPct, label: `${snaps.length - 1}d`, series };
}
function withDevPreview(d: { delta: number | null; deltaPct: number | null; label?: string; series: number[] }, current: number) {
  if (!DEV_PREVIEW || d.series.length >= 2) return d;
  const series = sampleSeries(current, 12);
  const first = series[0], last = series[series.length - 1];
  return { delta: last - first, deltaPct: first ? ((last - first) / first) * 100 : 0, label: "sample", series };
}

// ── Section header ────────────────────────────────────────
function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="eyebrow">{children}</span>
      <span className="h-px flex-1 bg-[var(--hq-hairline)]" />
      {right}
    </div>
  );
}

// ── Ideas section ─────────────────────────────────────────
type IdeaTab = "x" | "youtube" | "builds";
function IdeasPanel({ sageDrafts, ytIdeas, buildIdeas }: {
  sageDrafts: Draft[]; ytIdeas: YTIdea[]; buildIdeas: BuildIdea[];
}) {
  const [tab, setTab] = useState<IdeaTab>("x");
  const tabs: { key: IdeaTab; label: string; count: number }[] = [
    { key: "x", label: "X", count: sageDrafts.length },
    { key: "youtube", label: "YouTube", count: ytIdeas.length },
    { key: "builds", label: "Builds", count: buildIdeas.length },
  ];

  return (
    <div className="panel flex flex-col p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="eyebrow">Top Ideas</span>
        <div className="flex gap-1 rounded-lg border border-[var(--hq-hairline)] p-0.5">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                tab === t.key ? "bg-white/[0.08] text-[var(--hq-text)]" : "text-[var(--hq-text-ghost)] hover:text-[var(--hq-text-dim)]"
              }`}
            >
              {t.label}
              {t.count > 0 && <span className="ml-1 num text-[var(--hq-text-ghost)]">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1 min-h-[172px]">
        {tab === "x" && (sageDrafts.length > 0 ? sageDrafts.map((d, i) => (
          <a key={d.id} href="/x-content" className="group flex gap-3 items-center py-2 border-b border-[var(--hq-hairline)] last:border-0 hover:opacity-100 transition-opacity">
            <span className="num text-[11px] text-[var(--hq-text-ghost)] w-5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
            <p className="text-[var(--hq-text-dim)] text-[13px] leading-snug line-clamp-1 flex-1 group-hover:text-[var(--hq-text)] transition-colors">{d.text}</p>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--hq-text-ghost)] group-hover:text-[var(--hq-text-dim)] shrink-0 transition-all group-hover:translate-x-0.5" />
          </a>
        )) : <Empty>No pending drafts.</Empty>)}

        {tab === "youtube" && (ytIdeas.length > 0 ? ytIdeas.map((it, idx) => (
          <a key={idx} href="/youtube" className="group flex gap-3 items-center py-2 border-b border-[var(--hq-hairline)] last:border-0">
            <span className="num text-[11px] text-[var(--hq-text-ghost)] w-5 shrink-0">{String(idx + 1).padStart(2, "0")}</span>
            <p className="text-[var(--hq-text-dim)] text-[13px] font-medium line-clamp-1 flex-1 group-hover:text-[var(--hq-text)] transition-colors">{it.title}</p>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--hq-text-ghost)] group-hover:text-[var(--hq-text-dim)] shrink-0 transition-all group-hover:translate-x-0.5" />
          </a>
        )) : <Empty>No YouTube ideas yet.</Empty>)}

        {tab === "builds" && (buildIdeas.length > 0 ? buildIdeas.map((it, idx) => (
          <div key={idx} className="flex gap-3 items-center py-2 border-b border-[var(--hq-hairline)] last:border-0">
            <span className="num text-[11px] text-[var(--hq-text-ghost)] w-5 shrink-0">{String(idx + 1).padStart(2, "0")}</span>
            <p className="text-[var(--hq-text-dim)] text-[13px] font-medium line-clamp-1 flex-1">{it.title}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md num border shrink-0"
              style={it.effort === "quick win"
                ? { color: "var(--hq-up)", borderColor: "rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.08)" }
                : it.effort === "large"
                ? { color: "var(--hq-down)", borderColor: "rgba(251,113,133,0.25)", background: "rgba(251,113,133,0.08)" }
                : { color: "var(--hq-warn)", borderColor: "rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.08)" }}>
              {it.effort}
            </span>
          </div>
        )) : <Empty>No build ideas yet.</Empty>)}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[var(--hq-text-ghost)] text-[13px] py-8 text-center">{children}</p>;
}

// ── Top tweets ────────────────────────────────────────────
function TopTweetsPanel({ tweets }: { tweets: Tweet[] }) {
  return (
    <div className="panel flex flex-col p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Twitter className="w-3.5 h-3.5" style={{ color: "#38bdf8" }} />
        <span className="eyebrow">Top Tweets · 7d</span>
      </div>
      {tweets.length === 0 ? <Empty>No tweet data yet</Empty> : (
        <div className="space-y-0">
          {tweets.slice(0, 3).map((t, i) => (
            <a key={t.id} href={t.tweetUrl || "/x"} target="_blank" rel="noreferrer"
              className="group flex gap-3 py-3 border-b border-[var(--hq-hairline)] last:border-0">
              <span className="num text-[11px] text-[var(--hq-text-ghost)] w-5 shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1 min-w-0">
                {t.text
                  ? <p className="text-[var(--hq-text-dim)] text-[13px] leading-snug line-clamp-2 mb-1.5 group-hover:text-[var(--hq-text)] transition-colors">{t.text}</p>
                  : <p className="text-[var(--hq-text-ghost)] text-[13px] italic mb-1.5">External tweet</p>}
                <div className="flex items-center gap-3 text-[11px] num">
                  <span className="text-[var(--hq-text)] font-semibold">{fmt(t.views)}<span className="text-[var(--hq-text-ghost)] font-normal"> views</span></span>
                  <span className="text-[var(--hq-text-faint)]">{t.engRate.toFixed(1)}% eng</span>
                  {t.postedAt && <span className="text-[var(--hq-text-ghost)]">{timeAgo(t.postedAt)}</span>}
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--hq-text-ghost)] group-hover:text-[var(--hq-text-dim)] shrink-0 mt-0.5 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── X analytics panel ─────────────────────────────────────
function XAnalyticsPanel({ views, trend, totalTweets, bestDay, bestHour }: {
  views: number; trend: number[]; totalTweets: number; bestDay: string; bestHour: string;
}) {
  return (
    <div className="panel flex flex-col p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Twitter className="w-3.5 h-3.5" style={{ color: "#38bdf8" }} />
        <span className="eyebrow">X Analytics</span>
      </div>
      <div className="space-y-4">
        <div>
          <div className="eyebrow mb-2 !text-[9.5px]">Views · 7d</div>
          <div className="num font-semibold text-[40px] leading-[0.95] tracking-[-0.02em] text-[var(--hq-text)]">{fmt(views)}</div>
          {trend.some(v => v > 0) && <Sparkline data={trend} color="#38bdf8" area idSeed="xviews" className="h-9 mt-3" />}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <div className="eyebrow mb-1.5 !text-[9.5px]">Tracked</div>
            <div className="num font-semibold text-[18px] text-[var(--hq-text)]">{fmtExact(totalTweets)}</div>
          </div>
          <div>
            <div className="eyebrow mb-1.5 !text-[9.5px]">Best window</div>
            <div className="text-[13px] font-medium text-[var(--hq-text-dim)]">{bestDay}<span className="num"> · {bestHour}</span></div>
          </div>
        </div>
      </div>
      <a href="/x" className="mt-auto pt-4 flex items-center gap-1 text-[var(--hq-text-faint)] text-[11px] font-medium hover:text-[var(--hq-text-dim)] transition-colors group">
        Open X dashboard <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
    </div>
  );
}

// ── YouTube ───────────────────────────────────────────────
function YouTubeCard({ video, label }: { video: Video; label: string }) {
  return (
    <a href={video.url} target="_blank" rel="noreferrer" className="panel panel-interactive group flex flex-col overflow-hidden">
      {video.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnail} alt={video.title} className="w-full aspect-video object-cover opacity-75 group-hover:opacity-100 transition-opacity" />
      )}
      <div className="p-4">
        <div className="eyebrow mb-2" style={{ color: "#f87171" }}>{label}</div>
        <p className="text-[var(--hq-text-dim)] text-[13px] font-medium line-clamp-2 leading-snug group-hover:text-[var(--hq-text)] transition-colors">{video.title}</p>
        {video.publishedAt && <p className="num text-[var(--hq-text-ghost)] text-[11px] mt-2">{timeAgo(video.publishedAt)}</p>}
      </div>
    </a>
  );
}

// ── YouTube: Top Performing vs Latest (tabbed) ────────────
function YouTubeVideoTabs({ topVideo, latestVideo }: { topVideo: Video | null; latestVideo: Video | null }) {
  const [tab, setTab] = useState<"top" | "latest">("top");
  const video = tab === "top" ? (topVideo ?? latestVideo) : (latestVideo ?? topVideo);
  if (!video) return null;
  const Btn = ({ k, label }: { k: "top" | "latest"; label: string }) => (
    <button
      onClick={() => setTab(k)}
      className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
        tab === k ? "bg-white/[0.08] text-[var(--hq-text)]" : "text-[var(--hq-text-ghost)] hover:text-[var(--hq-text-dim)]"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="flex items-center gap-1 p-2 border-b border-[var(--hq-hairline)]">
        <span className="eyebrow ml-2 mr-1" style={{ color: "#f87171" }}>YouTube</span>
        <Btn k="top" label="Top Performing" />
        <Btn k="latest" label="Latest" />
      </div>
      <a href={video.url} target="_blank" rel="noreferrer" className="group block">
        {video.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail} alt={video.title} className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        )}
        <div className="p-4">
          <p className="text-[var(--hq-text-dim)] text-[13px] font-medium line-clamp-2 leading-snug group-hover:text-[var(--hq-text)] transition-colors">{video.title}</p>
          {video.publishedAt && <p className="num text-[var(--hq-text-ghost)] text-[11px] mt-2">{timeAgo(video.publishedAt)}</p>}
        </div>
      </a>
    </div>
  );
}

// ── Operational dashboard ────────────────────────────────
type WorkforceAgent = {
  name: string;
  lastEvent: ActivityEvent | null;
  tasks: HermesTask[];
};

function relativeTime(value: string | null, future = false) {
  if (!value) return "—";
  const stamp = new Date(value).getTime();
  if (Number.isNaN(stamp)) return value;
  const diff = future ? stamp - Date.now() : Date.now() - stamp;
  if (diff < 0) return future ? "due" : "just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return future ? "<1m" : "just now";
  if (minutes < 60) return `${future ? "in " : ""}${minutes}m${future ? "" : " ago"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${future ? "in " : ""}${hours}h${future ? "" : " ago"}`;
  const days = Math.floor(hours / 24);
  return `${future ? "in " : ""}${days}d${future ? "" : " ago"}`;
}

function levelColor(level: string) {
  if (level === "up") return "var(--up)";
  if (level === "warn") return "var(--warn)";
  if (level === "down") return "var(--down)";
  return "var(--accent)";
}

function statusTone(status: string): "neutral" | "up" | "down" | "warn" | "accent" {
  const value = status.toLowerCase();
  if (value.includes("fail") || value.includes("block")) return "down";
  if (value.includes("await") || value.includes("pause")) return "warn";
  if (value.includes("running") || value.includes("progress") || value.includes("doing")) return "accent";
  if (value.includes("done") || value.includes("complete") || value.includes("active")) return "up";
  return "neutral";
}

function OperationalMetric({ label, value, note, icon, tone = "neutral" }: {
  label: string; value: string | number; note: string; icon: React.ReactNode;
  tone?: "neutral" | "up" | "down" | "warn" | "accent";
}) {
  const colors = { neutral: "var(--text-2)", up: "var(--up)", down: "var(--down)", warn: "var(--warn)", accent: "var(--accent)" };
  return (
    <Panel className="p-4 min-h-[124px] flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{label}</Eyebrow>
        <span style={{ color: colors[tone] }}>{icon}</span>
      </div>
      <div>
        <div className="num text-[27px] font-semibold tracking-[-0.025em] text-[var(--text)]">{value}</div>
        <p className="mt-1 text-[11.5px] text-[var(--text-3)] line-clamp-1">{note}</p>
      </div>
    </Panel>
  );
}

function WorkforcePanel({ agents, loaded }: { agents: WorkforceAgent[]; loaded: boolean }) {
  return (
    <div>
      <SectionHeader
        label="Workforce"
        title="Active agents"
        action={<span className="num text-[11px] text-[var(--text-3)]">Observed from Hermes</span>}
      />
      <Panel className="p-2">
        {!loaded ? (
          <EmptyState className="!py-8" icon={<Bot className="w-6 h-6" />} title="Checking workforce activity…" />
        ) : agents.length === 0 ? (
          <EmptyState
            className="!py-8"
            icon={<Bot className="w-6 h-6" />}
            title="No active agent data yet"
            hint="Agents will appear when Hermes reports an assigned task or an attributed activity event."
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {agents.map((agent) => {
              const current = agent.tasks.find((task) => statusTone(task.status) === "accent") ?? agent.tasks[0];
              return (
                <div key={agent.name} className="rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-medium text-[var(--text)] truncate">{agent.name}</p>
                        <Pill tone={current ? statusTone(current.status) : "neutral"} className="!px-2 !py-0.5">
                          {current?.status ?? "recent activity"}
                        </Pill>
                      </div>
                      <p className="mt-1 text-[12px] text-[var(--text-3)] truncate">
                        {current?.title ?? agent.lastEvent?.title ?? "Activity observed"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-[var(--line)] flex items-center justify-between num text-[10.5px] text-[var(--text-3)]">
                    <span>{agent.tasks.length} assigned task{agent.tasks.length === 1 ? "" : "s"}</span>
                    <span>{agent.lastEvent ? relativeTime(agent.lastEvent.createdAt) : "task sync"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ActivityFeed({ events, loaded }: { events: ActivityEvent[]; loaded: boolean }) {
  return (
    <div>
      <SectionHeader label="Live activity" title="Hermes event stream" action={<Radio className="w-4 h-4 text-[var(--accent)]" />} />
      <Panel className="p-2">
        {!loaded ? (
          <EmptyState className="!py-8" icon={<Activity className="w-6 h-6" />} title="Loading recent activity…" />
        ) : events.length === 0 ? (
          <EmptyState className="!py-8" icon={<Activity className="w-6 h-6" />} title="No recent activity" hint="Hermes events will appear here when reported." />
        ) : (
          <div className="divide-y divide-[var(--line)] max-h-[310px] overflow-auto">
            {events.slice(0, 10).map((event) => (
              <div key={event.id} className="flex items-start gap-3 px-3.5 py-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: levelColor(event.level) }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p className="text-[13px] font-medium text-[var(--text)] leading-snug">{event.title}</p>
                    <span className="num text-[10.5px] text-[var(--text-3)] shrink-0 ml-auto">{relativeTime(event.createdAt)}</span>
                  </div>
                  {event.detail && <p className="mt-1 text-[12px] text-[var(--text-2)] leading-snug line-clamp-2">{event.detail}</p>}
                  {event.agent && <span className="num text-[10.5px] text-[var(--text-3)] mt-1.5 inline-block">{event.agent}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        <a href="/hermes" className="m-3 mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)]">
          Open full activity <ArrowUpRight className="w-3 h-3" />
        </a>
      </Panel>
    </div>
  );
}

function UpcomingRoutines({ jobs, loaded, syncedAt }: { jobs: CronJob[]; loaded: boolean; syncedAt: string | null }) {
  const visible = [...jobs]
    .sort((a, b) => Number(b.status === "active") - Number(a.status === "active"))
    .slice(0, 5);
  return (
    <div>
      <SectionHeader label="Automation" title="Upcoming routines" action={<span className="num text-[11px] text-[var(--text-3)]">synced {relativeTime(syncedAt)}</span>} />
      <Panel className="p-2">
        {!loaded ? (
          <EmptyState className="!py-8" icon={<CalendarClock className="w-6 h-6" />} title="Loading routines…" />
        ) : visible.length === 0 ? (
          <EmptyState className="!py-8" icon={<CalendarClock className="w-6 h-6" />} title="No routines scheduled" hint="Hermes cron jobs will appear here after the bridge syncs them." />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {visible.map((job) => (
              <div key={job.id} className="flex items-start gap-3 px-3.5 py-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: job.status === "active" ? "var(--up)" : "var(--text-3)" }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-[var(--text)] truncate">{job.name || job.id}</p>
                    <Pill tone={job.status === "active" ? "up" : "neutral"} className="!px-2 !py-0.5 ml-auto">{job.status}</Pill>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 num text-[10.5px] text-[var(--text-3)]">
                    <span className="text-[var(--text-2)]">{job.schedule || "Schedule unavailable"}</span>
                    {job.nextRun && <span>next {relativeTime(job.nextRun, true)}</span>}
                    {job.deliver && <span>→ {job.deliver.split(":")[0]}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <a href="/hermes" className="m-3 mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)]">
          Manage routines <ArrowUpRight className="w-3 h-3" />
        </a>
      </Panel>
    </div>
  );
}

// ── Hermes Kanban ─────────────────────────────────────────
function HermesKanbanPanel({ kanban }: { kanban: HermesKanban }) {
  const statusColor = (s: string) => {
    const k = s.toLowerCase();
    if (k.includes("done") || k.includes("complete")) return "var(--hq-up)";
    if (k.includes("progress") || k.includes("doing")) return "var(--accent)";
    if (k.includes("block")) return "var(--hq-down)";
    return "var(--hq-text-faint)";
  };
  const entries = Object.entries(kanban.counts || {});
  return (
    <div className="panel flex flex-col p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <span className="eyebrow">Hermes Board</span>
          <p className="text-[13px] text-[var(--hq-text-dim)] truncate mt-1">{kanban.board}</p>
        </div>
        <span className="num text-[22px] font-semibold text-[var(--hq-text)] shrink-0">{kanban.total}</span>
      </div>

      {entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {entries.map(([status, count]) => (
            <span key={status} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium num"
              style={{ color: statusColor(status), background: `color-mix(in srgb, ${statusColor(status)} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${statusColor(status)} 22%, transparent)` }}>
              {status} {count}
            </span>
          ))}
        </div>
      )}

      {kanban.tasks.length === 0 ? <Empty>No active tasks.</Empty> : (
        <div className="space-y-0">
          {kanban.tasks.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--hq-hairline)] last:border-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColor(t.status) }} />
              <p className="text-[13px] text-[var(--hq-text-dim)] leading-snug line-clamp-1 flex-1">{t.title}</p>
              {t.assignee && <span className="num text-[10.5px] text-[var(--hq-text-ghost)] shrink-0">{t.assignee}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Momentum Score gauge (dashboard hero) ─────────────────
function ScoreGauge({ score }: { score: ScoreData }) {
  const tier = score.score >= 80 ? "var(--hq-up)" : score.score >= 60 ? "var(--hq-warn)" : "var(--hq-down)";
  const counted = useCountUp(score.score, 1400, true);
  const R = 50, C = 2 * Math.PI * R;
  const pct = Math.min(100, Math.max(0, counted));
  const comps = Object.entries(score.components || {}).slice(0, 4);
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[112px] h-[112px] shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--hq-hairline)" strokeWidth="6" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={tier} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(C * pct) / 100} ${C}`} style={{ transition: "stroke-dasharray 0.5s var(--ease)" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num font-semibold text-[32px] leading-none tracking-[-0.02em]" style={{ color: tier }}>{Math.round(counted)}</span>
          <span className="num text-[10.5px] text-[var(--hq-text-ghost)] mt-1">{score.grade}</span>
        </div>
      </div>
      <div className="hidden sm:block w-[176px]">
        <div className="eyebrow !text-[9.5px]">Momentum</div>
        <div className="text-[14px] font-semibold mt-0.5 mb-2.5" style={{ color: tier }}>{score.label}</div>
        <div className="space-y-[7px]">
          {comps.map(([k, c]) => {
            const cc = c.score >= 80 ? "var(--hq-up)" : c.score >= 40 ? "var(--hq-warn)" : "var(--hq-down)";
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="num text-[9.5px] text-[var(--hq-text-ghost)] w-14 truncate">{c.label.split(" ")[0]}</span>
                <div className="h-[3px] flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: cc, opacity: 0.85, transition: "width 1s var(--ease)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
export default function Dashboard() {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [health, setHealth] = useState<HermesHealth | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [requests, setRequests] = useState<AgentRequestItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [tasks, setTasks] = useState<HermesTask[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [cronSyncedAt, setCronSyncedAt] = useState<string | null>(null);
  const [operationsLoaded, setOperationsLoaded] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const loadOperations = useCallback(async () => {
    const getJSON = async <T,>(url: string): Promise<T | null> => {
      try {
        const response = await fetch(url);
        return response.ok ? await response.json() as T : null;
      } catch {
        return null;
      }
    };
    const [healthData, activityData, requestData, taskData, cronData] = await Promise.all([
      getJSON<HermesHealth>("/api/hermes/health"),
      getJSON<{ events: ActivityEvent[] }>("/api/hermes/activity?take=30"),
      getJSON<{ requests: AgentRequestItem[]; pending: number }>("/api/hermes/requests?take=100"),
      getJSON<{ tasks: HermesTask[]; total: number }>("/api/hermes/tasks"),
      getJSON<{ jobs: CronJob[]; syncedAt: string | null }>("/api/hermes/crons"),
    ]);
    if (healthData) setHealth(healthData);
    if (activityData) setActivity(activityData.events ?? []);
    if (requestData) {
      setRequests(requestData.requests ?? []);
      setPendingRequests(requestData.pending ?? 0);
    }
    if (taskData) {
      setTasks(taskData.tasks ?? []);
      setTaskTotal(taskData.total ?? taskData.tasks?.length ?? 0);
    }
    if (cronData) {
      setJobs(cronData.jobs ?? []);
      setCronSyncedAt(cronData.syncedAt ?? null);
    }
    setOperationsLoaded(true);
  }, []);

  useEffect(() => {
    loadOperations();
    const interval = setInterval(loadOperations, 10_000);
    return () => clearInterval(interval);
  }, [loadOperations]);
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!mounted) return null;

  const rise = (i: number) => ({ animationDelay: `${i * 60}ms` });
  const runningRequests = requests.filter(request => ["approved", "queued", "running"].includes(request.status)).length;
  const failedRequests = requests.filter(request => request.status === "failed").length;
  const openTasks = tasks.filter(task => !/(done|complete|completed|cancelled)/i.test(task.status)).length;
  const activeJobs = jobs.filter(job => job.status === "active").length;
  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const activeTasks = tasks.filter(task => !/(done|complete|completed|cancelled)/i.test(task.status));
  const recentAttributedEvents = activity.filter(event => event.agent && new Date(event.createdAt).getTime() >= recentCutoff);
  const agentNames = Array.from(new Set([
    ...activeTasks.map(task => task.assignee?.trim()).filter((name): name is string => Boolean(name)),
    ...recentAttributedEvents.map(event => event.agent?.trim()).filter((name): name is string => Boolean(name)),
  ]));
  const workforce: WorkforceAgent[] = agentNames.map(name => ({
    name,
    tasks: activeTasks.filter(task => task.assignee?.trim() === name),
    lastEvent: recentAttributedEvents.find(event => event.agent?.trim() === name) ?? null,
  }));

  return (
    <>
      <div className="relative z-10 w-full mx-auto pb-16">

        {/* ── Reserved mission banner / future hero architecture ── */}
        <section
          className="hq-rise relative min-h-[178px] overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--surface-1)] px-6 py-6 sm:px-7 sm:py-6 mb-5"
          style={rise(0)}
        >
          <div className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: "radial-gradient(circle at 82% 28%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 34%), linear-gradient(120deg, transparent 45%, rgba(255,255,255,0.018))" }} />
          <div className="relative h-full flex flex-col justify-between gap-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Eyebrow>Mission control</Eyebrow>
                <h1 className="mt-2.5 text-[34px] sm:text-[39px] font-semibold tracking-[-0.03em] leading-none text-[var(--text)]">
                  {greeting()}, {process.env.NEXT_PUBLIC_OWNER_NAME || "Founder"}
                </h1>
                <p className="mt-2.5 text-[13px] text-[var(--text-2)]">Your operating picture across Hermes, its work, and the systems that need you.</p>
              </div>
              <Pill tone={health?.online ? "up" : health ? "down" : "neutral"}>
                <span className="relative flex w-1.5 h-1.5">
                  {health?.online && <span className="absolute inline-flex h-full w-full rounded-full animate-ping bg-[var(--up)] opacity-50" />}
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full" style={{ background: health?.online ? "var(--up)" : health ? "var(--down)" : "var(--text-3)" }} />
                </span>
                {health ? (health.online ? "Hermes online" : "Hermes offline") : operationsLoaded ? "Hermes unavailable" : "Checking Hermes"}
              </Pill>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="num text-[11.5px] text-[var(--text-3)]">
                {time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                {" · "}
                {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
              </div>
              <div className="flex items-center gap-4 num text-[10.5px] text-[var(--text-3)]">
                <span>gateway <span className="text-[var(--text-2)]">{health?.gateway ?? "unknown"}</span></span>
                <span>last seen <span className="text-[var(--text-2)]">{relativeTime(health?.lastSeen ?? null)}</span></span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Operational KPI row ────────────────────────── */}
        <section className="hq-rise mb-8" style={rise(1)}>
          <SectionHeader label="System status" title="Operations at a glance" />
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            <OperationalMetric
              label="Hermes"
              value={!operationsLoaded ? "—" : health ? (health.online ? "Online" : "Offline") : "Unavailable"}
              note={health?.lastSeen ? `Seen ${relativeTime(health.lastSeen)}` : "No heartbeat recorded"}
              icon={<Server className="w-4 h-4" />}
              tone={health?.online ? "up" : health ? "down" : "neutral"}
            />
            <OperationalMetric label="In flight" value={operationsLoaded ? runningRequests : "—"} note="Queued, approved, or running" icon={<Radio className="w-4 h-4" />} tone={runningRequests > 0 ? "accent" : "neutral"} />
            <OperationalMetric label="Open tasks" value={operationsLoaded ? openTasks : "—"} note={`${taskTotal} total synced tasks`} icon={<CheckCircle2 className="w-4 h-4" />} tone={openTasks > 0 ? "accent" : "neutral"} />
            <OperationalMetric label="Routines" value={operationsLoaded ? activeJobs : "—"} note={`${jobs.length} total schedules`} icon={<CalendarClock className="w-4 h-4" />} tone={activeJobs > 0 ? "up" : "neutral"} />
            <OperationalMetric label="Needs you" value={operationsLoaded ? pendingRequests : "—"} note={failedRequests > 0 ? `${failedRequests} failed request${failedRequests === 1 ? "" : "s"}` : "Approval queue clear"} icon={<CircleAlert className="w-4 h-4" />} tone={pendingRequests > 0 || failedRequests > 0 ? "warn" : "up"} />
          </div>
        </section>

        <div className="hq-rise mb-8" style={rise(2)}>
          <HermesBriefing compact />
        </div>

        {/* ── Workforce + live activity ──────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] gap-5 items-start mb-8">
          <div className="hq-rise" style={rise(2)}>
            <WorkforcePanel agents={workforce} loaded={operationsLoaded} />
          </div>
          <div className="hq-rise" style={rise(3)}>
            <ActivityFeed events={activity} loaded={operationsLoaded} />
          </div>
        </section>

        {/* ── Routines + approvals ───────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] gap-5 items-start mb-8">
          <div className="hq-rise" style={rise(4)}>
            <UpcomingRoutines jobs={jobs} loaded={operationsLoaded} syncedAt={cronSyncedAt} />
          </div>
          <div className="hq-rise max-h-[430px] overflow-auto pr-1" style={rise(5)}>
            <ApprovalInbox compact />
          </div>
        </section>

      </div>
    </>
  );
}
