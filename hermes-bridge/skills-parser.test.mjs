import test from "node:test";
import assert from "node:assert/strict";
import { createSkillsSnapshot, markSkillsDiscoveryFailure, parseSkillsList } from "./skills-parser.mjs";

const table = (rows, footer) => `Installed Skills\n┏━━┓\n┃ Name ┃ Category ┃ Source ┃ Trust ┃ Status ┃\n${rows.map((row) => `│ ${row.join(" │ ")} │`).join("\n")}\n└━━┘\n${footer}`;
const populated = table([
  ["codex", "autonomous-ai-agents", "builtin", "builtin", "enabled"],
  ["notion", "productivity", "builtin", "builtin", "disabled"],
], "0 hub-installed, 2 builtin, 0 local — 1 enabled, 1 disabled");

test("parses populated and disabled skill records", () => {
  const result = parseSkillsList(populated);
  assert.equal(result.skills.length, 2);
  assert.deepEqual(result.skills.map(({ name, enabled }) => [name, enabled]), [["codex", true], ["notion", false]]);
  assert.equal(result.listReported, 2);
  assert.deepEqual(result.warnings, []);
});

test("parses a truthful zero-skill result", () => {
  const result = parseSkillsList(table([], "0 hub-installed, 0 builtin, 0 local — 0 enabled, 0 disabled"));
  assert.equal(result.skills.length, 0);
  assert.equal(result.listReported, 0);
  assert.deepEqual(result.warnings, []);
});

test("ignores malformed rows and reports missing optional status", () => {
  const raw = table([
    ["broken", "research", "", "community", "enabled"],
    ["unknown-state", "", "local", "", "waiting"],
  ], "0 hub-installed, 0 builtin, 1 local — 0 enabled, 0 disabled");
  const result = parseSkillsList(raw);
  assert.equal(result.skills.length, 1);
  assert.equal(result.skills[0].category, null);
  assert.equal(result.skills[0].trust, null);
  assert.equal(result.skills[0].enabled, null);
  assert.ok(result.warnings.some((warning) => warning.includes("malformed")));
  assert.ok(result.warnings.some((warning) => warning.includes("Unknown status")));
});

test("keeps the first duplicate identity deterministically", () => {
  const raw = table([
    ["codex", "agents", "builtin", "builtin", "enabled"],
    ["codex", "other", "local", "local", "disabled"],
  ], "0 hub-installed, 2 builtin, 0 local — 1 enabled, 1 disabled");
  const result = parseSkillsList(raw);
  assert.equal(result.skills.length, 1);
  assert.equal(result.skills[0].source, "builtin");
  assert.ok(result.warnings.some((warning) => warning.includes("Duplicate")));
});

test("marks the 76 versus 81 discrepancy partial without synthesizing records", () => {
  const rows = Array.from({ length: 76 }, (_, index) => [`skill-${index}`, "research", "builtin", "builtin", "enabled"]);
  const snapshot = createSkillsSnapshot({
    listOutput: table(rows, "0 hub-installed, 76 builtin, 0 local — 76 enabled, 0 disabled"),
    profileOutput: "Profile: default\nSkills: 81\n",
    versionOutput: "Hermes Agent v0.20.0 (2026.8.3)",
    syncedAt: "2026-09-09T00:00:00.000Z",
  });
  assert.equal(snapshot.skills.length, 76);
  assert.equal(snapshot.counts.profileReported, 81);
  assert.equal(snapshot.completeness, "partial");
  assert.ok(snapshot.warnings.some((warning) => warning.includes("81") && warning.includes("76")));
});

test("preserves the last successful snapshot and marks it stale after failure", () => {
  const previous = createSkillsSnapshot({ listOutput: populated, syncedAt: "2026-09-09T00:00:00.000Z" });
  const failed = markSkillsDiscoveryFailure(previous, "2026-09-09T00:01:00.000Z");
  assert.equal(failed.skills.length, 2);
  assert.equal(failed.syncedAt, previous.syncedAt);
  assert.equal(failed.stale, true);
});

test("represents discovery failure without a previous snapshot as unavailable", () => {
  const failed = markSkillsDiscoveryFailure(null, "2026-09-09T00:01:00.000Z");
  assert.equal(failed.available, false);
  assert.equal(failed.skills.length, 0);
  assert.equal(failed.completeness, "unknown");
});
