const MAX_INPUT = 512 * 1024;
const KNOWN_SOURCES = new Set(["builtin", "hub", "local"]);

export function stripTerminalFormatting(value) {
  const ansi = new RegExp("\\u001B(?:[@-Z\\\\-_]|\\[[0-?]*[ -/]*[@-~])", "g");
  return String(value ?? "").slice(0, MAX_INPUT).replace(ansi, "").replace(/\r/g, "");
}

function cleanCell(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseSkillsList(raw) {
  const text = stripTerminalFormatting(raw);
  const warnings = [];
  const malformed = [];
  const byName = new Map();

  for (const [index, line] of text.split("\n").entries()) {
    if (!line.includes("│")) continue;
    const cells = line.split("│").slice(1, -1).map(cleanCell);
    if (cells.length !== 5 || cells[0].toLowerCase() === "name") continue;
    const [name, category, rawSource, trust, rawStatus] = cells;
    if (!name || !rawSource || !rawStatus) {
      malformed.push(index + 1);
      continue;
    }
    const source = rawSource.toLowerCase();
    const status = rawStatus.toLowerCase();
    const skill = {
      name: name.slice(0, 160),
      slug: name.slice(0, 160),
      category: category ? category.slice(0, 120) : null,
      source: KNOWN_SOURCES.has(source) ? source : "unknown",
      trust: trust ? trust.slice(0, 80) : null,
      enabled: status === "enabled" ? true : status === "disabled" ? false : null,
    };
    if (name.includes("…")) warnings.push(`Skill name on row ${index + 1} was truncated by Hermes output.`);
    if (skill.source === "unknown") warnings.push(`Unknown source on row ${index + 1}.`);
    if (skill.enabled === null) warnings.push(`Unknown status on row ${index + 1}.`);
    if (byName.has(skill.name)) {
      warnings.push(`Duplicate skill identity '${skill.name}' was ignored.`);
      continue;
    }
    byName.set(skill.name, skill);
  }

  if (malformed.length) warnings.push(`${malformed.length} malformed skill row${malformed.length === 1 ? " was" : "s were"} ignored.`);

  const footer = text.match(/(\d+)\s+hub-installed,\s+(\d+)\s+builtin,\s+(\d+)\s+local\s+[—-]\s+(\d+)\s+enabled(?:,\s+(\d+)\s+disabled)?/i);
  const reported = footer ? {
    hub: Number(footer[1]), builtin: Number(footer[2]), local: Number(footer[3]),
    enabled: Number(footer[4]), disabled: footer[5] == null ? null : Number(footer[5]),
  } : null;
  if (!reported) warnings.push("Hermes skill totals could not be parsed.");

  const skills = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  const listReported = reported ? reported.hub + reported.builtin + reported.local : null;
  if (listReported !== null && listReported !== skills.length) {
    warnings.push(`Hermes reported ${listReported} installed skills but ${skills.length} unique rows were parsed.`);
  }

  return { skills, reported, listReported, warnings: [...new Set(warnings)] };
}

export function parseProfileSkillsTotal(raw) {
  const match = stripTerminalFormatting(raw).match(/^Skills:\s*(\d+)\s*$/im);
  return match ? Number(match[1]) : null;
}

export function parseHermesVersion(raw) {
  return stripTerminalFormatting(raw).match(/Hermes Agent v([^\s]+)/i)?.[1] ?? null;
}

export function createSkillsSnapshot({ listOutput, profileOutput = "", versionOutput = "", syncedAt }) {
  const parsed = parseSkillsList(listOutput);
  const profileReported = parseProfileSkillsTotal(profileOutput);
  const warnings = [...parsed.warnings];
  if (profileReported !== null && parsed.listReported !== null && profileReported !== parsed.listReported) {
    warnings.push(`Hermes profile summary reports ${profileReported} skills; ${parsed.listReported} are individually listed.`);
  }
  const partial = warnings.length > 0 || parsed.skills.some((skill) => skill.enabled === null);
  return {
    schemaVersion: 1,
    source: "hermes-runtime",
    runtime: { version: parseHermesVersion(versionOutput), profile: "default" },
    skills: parsed.skills,
    counts: {
      verified: parsed.skills.length,
      listReported: parsed.listReported,
      profileReported,
      builtin: parsed.reported?.builtin ?? null,
      hub: parsed.reported?.hub ?? null,
      local: parsed.reported?.local ?? null,
      enabled: parsed.reported?.enabled ?? null,
      disabled: parsed.reported?.disabled ?? null,
    },
    completeness: partial ? "partial" : "complete",
    warnings: [...new Set(warnings)],
    syncedAt,
    lastAttemptAt: syncedAt,
    stale: false,
    available: true,
  };
}

export function markSkillsDiscoveryFailure(previous, attemptedAt) {
  if (previous?.available && Array.isArray(previous.skills)) {
    return {
      ...previous,
      completeness: previous.completeness === "complete" ? "partial" : previous.completeness,
      warnings: [...new Set([...(previous.warnings ?? []), "Latest Hermes skill discovery failed; showing the last successful snapshot."])],
      lastAttemptAt: attemptedAt,
      stale: true,
    };
  }
  return {
    schemaVersion: 1,
    source: "hermes-runtime",
    runtime: { version: null, profile: "default" },
    skills: [],
    counts: { verified: 0, listReported: null, profileReported: null, builtin: null, hub: null, local: null, enabled: null, disabled: null },
    completeness: "unknown",
    warnings: ["Hermes skill inventory is unavailable because discovery has not succeeded."],
    syncedAt: null,
    lastAttemptAt: attemptedAt,
    stale: false,
    available: false,
  };
}
