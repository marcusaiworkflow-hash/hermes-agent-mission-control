# Mission Control Roadmap and Codex Workflow

This file records the current product roadmap and the required development workflow for substantial Mission Control work.

## Current Production Status

### Complete and stable

- Step 47 — Sidebar / Navigation
  - complete
  - deployed to production

- Step 48 — Dashboard v1
  - complete
  - deployed to production
  - production data loading stabilized

Dashboard v1 currently includes:
- Hermes Health
- operational KPI row
- Chief of Staff briefing
- Active Agents / workforce
- Hermes Event Stream / Live Activity
- Upcoming Routines
- Approval Inbox

Production database compatibility depends on the existing Supabase Transaction Pooler configuration with Prisma/PgBouncer compatibility parameters.

Do not casually alter this configuration.

## Current Automation Objective

The current development priority is reducing human babysitting of Mission Control coding.

Target workflow:

task/spec
-> isolated Codex branch
-> autonomous implementation
-> limited iteration/self-repair
-> independent build/tests
-> audit/review report
-> human approval
-> merge
-> deployment

The human approval gate belongs at the end of a substantial job, not after every small edit.

Codex must never receive unrestricted production authority.

## Operational-Core Roadmap

Build in this order unless an explicit task changes the priority:

1. Tasks
2. Routines
3. Agents + Activity
4. Sessions
5. Skills
6. Calendar / Chats refinement

After the operational core:

7. Growth / Intelligence pages as real data/workflows become available
8. final visual polish
9. Telegram
10. n8n + integrations
11. real automations
12. advanced autonomy

## First Real Delegated Build — Tasks

The first substantial unattended Codex implementation should be the Tasks page.

Before editing, inspect:

- existing `/tasks`
- `/api/hermes/tasks`
- request / approval infrastructure
- Prisma models related to tasks and requests
- existing reusable kanban / task components
- Mission Control context pack
- Tasks visual guidance from the August 29 reference

Goal:

Build a real-data operational task board that reflects actual Hermes work.

Requirements:

- use real task data
- preserve truthful empty states
- show useful task status
- show assignee when real
- show priority when available
- show result/execution context where useful
- integrate request/approval state only where supported
- avoid fake agent telemetry
- reuse existing components where practical
- preserve the dark Hermy HQ design language

The implementation must pass independent validation before human review.

## After Tasks

### Routines

Build from `/api/hermes/crons`.

Focus on:
- schedule
- next run
- status
- last run/result
- delivery
- mode
- supported controls
- approval semantics

### Agents + Activity

Build the permanent workforce view from real data and explicitly modeled future agent state.

Do not revive starter agents as if they are real.

Activity should remain grounded in real AgentEvent data.

### Sessions

Start with a read-only execution-history view.

### Skills

Start with a read-only capability/skills inventory.

### Calendar / Chats

Refine these when real scheduling and communications integrations justify them.

## Growth / Intelligence Rule

Do not spend time filling secondary pages with mock dashboards.

Pages such as Revenue, Analytics, Competitors, Social, Integrations, Research, Brain Dump, and Mind should become substantive only when real data or workflows exist.

Activity and Settings can progress sooner when operational needs justify them.

## Codex Branch Rules

Substantial Codex work must occur on isolated branches.

Expected naming pattern:

`codex/<task-name>`

Examples:
- `codex/tasks`
- `codex/routines`
- `codex/agents-activity`

Never perform autonomous implementation on `main`.

## Required Pre-Work

Before editing:

1. confirm current branch
2. confirm tracked working tree is clean
3. read `AGENTS.md`
4. read the Mission Control context pack
5. inspect the relevant routes/APIs/components
6. identify protected systems that must not be touched

## Required Validation

After implementation:

- run relevant tests when available
- run `npm run build`
- run `git diff --check`
- inspect Git status
- list changed files
- summarize implementation
- summarize test/build results
- identify risks
- identify unresolved issues
- stop for human review

A Codex exit failure must not prevent generation of a useful review report.

## Limited Self-Repair

The unattended runner may allow a small, bounded repair loop for implementation/build failures.

Self-repair must be limited.

It must not:
- weaken safety rules
- modify protected infrastructure without explicit task scope
- push or merge
- deploy
- hide failed validation
- continue indefinitely

If the task cannot be completed safely, Codex should stop and report the blocker.

## Human Approval Boundary

Codex may:
- inspect
- edit on an isolated branch
- run tests/builds
- iterate within bounded limits
- produce review artifacts

Codex may not automatically:
- merge to `main`
- push production changes to `main`
- deploy production
- expose secrets
- bypass approval flows

Production remains a human-approved action.

## Parallel Work Principle

Mission Control development should increasingly run with less human involvement so the user can work on the separate Hermes Revenue Engine in parallel.

Do not turn Mission Control tasks into business-strategy work.

The purpose of this automation framework is to make the technical build more independent while keeping production safe.
