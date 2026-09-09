import test from "node:test";
import assert from "node:assert/strict";
import { isSnapshotOld, sanitizeSkillsSnapshot } from "./hermes-skills";

test("allowlists snapshot and skill fields without leaking raw or sensitive values", () => {
  const snapshot = sanitizeSkillsSnapshot({
    schemaVersion: 99,
    source: "untrusted",
    raw: "terminal output",
    token: "secret",
    available: true,
    completeness: "complete",
    runtime: { version: "0.20.0", profile: "default", environment: "hidden" },
    skills: [{
      name: "codex",
      slug: "codex",
      category: "agents",
      source: "builtin",
      trust: "builtin",
      enabled: true,
      path: "/sensitive/path",
      requirements: ["credential"],
    }],
    counts: { listReported: 1, profileReported: 81, builtin: 1, hub: 0, local: 0, enabled: 1, disabled: 0 },
  });
  assert.equal(snapshot.skills.length, 1);
  assert.deepEqual(Object.keys(snapshot.skills[0]).sort(), ["category", "enabled", "name", "slug", "source", "trust"]);
  assert.equal(JSON.stringify(snapshot).includes("terminal output"), false);
  assert.equal(JSON.stringify(snapshot).includes("secret"), false);
  assert.equal(JSON.stringify(snapshot).includes("sensitive"), false);
});

test("invalid and duplicate stored records are omitted and downgrade completeness", () => {
  const snapshot = sanitizeSkillsSnapshot({
    available: true,
    completeness: "complete",
    skills: [{ name: "codex", source: "builtin", enabled: true }, { name: "codex", source: "local" }, null],
    counts: { listReported: 3 },
  });
  assert.equal(snapshot.skills.length, 1);
  assert.equal(snapshot.counts.verified, 1);
  assert.equal(snapshot.completeness, "partial");
  assert.ok(snapshot.warnings.some((warning) => warning.includes("omitted by the API")));
});

test("unknown sources and missing optional fields remain truthful", () => {
  const snapshot = sanitizeSkillsSnapshot({
    available: true,
    completeness: "partial",
    skills: [{ name: "internal", source: "unexpected", enabled: "yes" }],
    counts: {},
  });
  assert.deepEqual(snapshot.skills[0], { name: "internal", slug: "internal", category: null, source: "unknown", trust: null, enabled: null });
});

test("freshness helper distinguishes current, stale, missing, and invalid timestamps", () => {
  const now = Date.parse("2026-09-09T00:10:00.000Z");
  assert.equal(isSnapshotOld("2026-09-09T00:09:00.000Z", now), false);
  assert.equal(isSnapshotOld("2026-09-09T00:00:00.000Z", now), true);
  assert.equal(isSnapshotOld(null, now), false);
  assert.equal(isSnapshotOld("invalid", now), false);
});
