export type SkillSource = "builtin" | "hub" | "local" | "unknown";
export type SkillCompleteness = "complete" | "partial" | "unknown";

export type HermesSkill = {
  name: string;
  slug: string;
  category: string | null;
  source: SkillSource;
  trust: string | null;
  enabled: boolean | null;
};

export type HermesSkillsSnapshot = {
  schemaVersion: 1;
  source: "hermes-runtime";
  runtime: { version: string | null; profile: string };
  skills: HermesSkill[];
  counts: {
    verified: number;
    listReported: number | null;
    profileReported: number | null;
    builtin: number | null;
    hub: number | null;
    local: number | null;
    enabled: number | null;
    disabled: number | null;
  };
  completeness: SkillCompleteness;
  warnings: string[];
  syncedAt: string | null;
  lastAttemptAt: string | null;
  stale: boolean;
  available: boolean;
};

const sources = new Set<SkillSource>(["builtin", "hub", "local", "unknown"]);
const completenessValues = new Set<SkillCompleteness>(["complete", "partial", "unknown"]);
const text = (value: unknown, max: number) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;

export function sanitizeSkillsSnapshot(value: unknown): HermesSkillsSnapshot {
  const root = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const rawRuntime = root.runtime && typeof root.runtime === "object" && !Array.isArray(root.runtime) ? root.runtime as Record<string, unknown> : {};
  const rawCounts = root.counts && typeof root.counts === "object" && !Array.isArray(root.counts) ? root.counts as Record<string, unknown> : {};
  const seen = new Set<string>();
  const skills: HermesSkill[] = [];
  let discarded = 0;
  for (const item of Array.isArray(root.skills) ? root.skills.slice(0, 1000) : []) {
    if (!item || typeof item !== "object" || Array.isArray(item)) { discarded += 1; continue; }
    const record = item as Record<string, unknown>;
    const name = text(record.name, 160);
    if (!name || seen.has(name)) { discarded += 1; continue; }
    seen.add(name);
    const rawSource = text(record.source, 20) as SkillSource | null;
    skills.push({
      name,
      slug: text(record.slug, 160) ?? name,
      category: text(record.category, 120),
      source: rawSource && sources.has(rawSource) ? rawSource : "unknown",
      trust: text(record.trust, 80),
      enabled: typeof record.enabled === "boolean" ? record.enabled : null,
    });
  }
  const storedWarnings = Array.isArray(root.warnings)
    ? root.warnings.map((warning) => text(warning, 240)).filter((warning): warning is string => Boolean(warning)).slice(0, 30)
    : [];
  if (discarded) storedWarnings.push(`${discarded} invalid or duplicate stored record${discarded === 1 ? " was" : "s were"} omitted by the API.`);
  const available = root.available === true;
  const rawCompleteness = text(root.completeness, 20) as SkillCompleteness | null;
  const listReported = count(rawCounts.listReported);
  if (listReported !== null && listReported !== skills.length && !storedWarnings.some((warning) => warning.includes("unique rows were parsed"))) {
    storedWarnings.push(`Hermes reported ${listReported} installed skills but ${skills.length} unique rows were returned by the API.`);
  }
  const completeness = rawCompleteness && completenessValues.has(rawCompleteness) ? rawCompleteness : "unknown";
  return {
    schemaVersion: 1,
    source: "hermes-runtime",
    runtime: { version: text(rawRuntime.version, 40), profile: text(rawRuntime.profile, 80) ?? "default" },
    skills,
    counts: {
      verified: skills.length,
      listReported,
      profileReported: count(rawCounts.profileReported),
      builtin: count(rawCounts.builtin),
      hub: count(rawCounts.hub),
      local: count(rawCounts.local),
      enabled: count(rawCounts.enabled),
      disabled: count(rawCounts.disabled),
    },
    completeness: storedWarnings.length && completeness === "complete" ? "partial" : completeness,
    warnings: [...new Set(storedWarnings)],
    syncedAt: text(root.syncedAt, 40),
    lastAttemptAt: text(root.lastAttemptAt, 40),
    stale: root.stale === true,
    available,
  };
}

export function isSnapshotOld(syncedAt: string | null, now = Date.now(), thresholdMs = 120_000) {
  if (!syncedAt) return false;
  const timestamp = Date.parse(syncedAt);
  return Number.isFinite(timestamp) && now - timestamp > thresholdMs;
}

export function unavailableSkillsSnapshot(): HermesSkillsSnapshot {
  return sanitizeSkillsSnapshot({
    available: false,
    completeness: "unknown",
    warnings: ["Hermes skill discovery has not produced a successful snapshot."],
    runtime: { profile: "default" },
    skills: [],
    counts: {},
  });
}
