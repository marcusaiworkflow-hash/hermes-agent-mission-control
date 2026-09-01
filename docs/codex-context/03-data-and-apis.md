# Mission Control Data Sources and Hermes APIs

Codex should prefer existing real Hermes data over invented state, mock telemetry, or legacy placeholders.

Always inspect the current repository before relying on this document, because endpoints and response shapes may evolve.

## Core Real Hermes APIs

### `/api/hermes/health`

Purpose:
- current Hermes health / availability state

Known useful fields include:
- `online`
- `gateway`
- `detail`
- `lastSeen`

Source:
- mirrored Hermes health data stored by the Hermes Bridge

Use this for:
- genuine online/offline state
- system-health indicators
- last-seen information

Do not replace it with decorative status.

---

### `/api/hermes/activity`

Purpose:
- recent operational Hermes / Bridge activity

Known useful fields include:
- `kind`
- `title`
- `detail`
- `agent`
- `level`
- `meta`
- `createdAt`

Source:
- Prisma `AgentEvent` records written by Hermes/Bridge activity

Use this for:
- event streams
- activity feeds
- recent-work evidence
- execution/status context

Important:
Activity is real, but historically many Bridge events have used `agent="Hermes"`. Do not pretend this is already a complete permanent multi-agent registry.

---

### `/api/hermes/crons`

Purpose:
- Hermes scheduled routines / cron workflows

Known useful fields include:
- `name`
- `status`
- `schedule`
- `nextRun`
- `lastRun`
- `lastResult`
- `deliver`
- `skills`
- `script`
- `mode`

Use this for:
- Upcoming Routines
- dedicated Routines page
- next-run information
- routine health/status
- recent execution information
- delivery targets and workflow metadata

Existing mutations have supported operations such as:
- create
- pause
- resume
- run
- remove
- edit

Some side-effecting operations use the request/approval infrastructure. Inspect the current route before implementing controls.

---

### `/api/hermes/requests`

Purpose:
- genuine request / approval / execution lifecycle

Known lifecycle states include:
- `queued`
- `awaiting_approval`
- `approved`
- `running`
- `done`
- `failed`
- `rejected`

Use this for:
- Approval Inbox
- Needs You / attention counts
- in-flight work
- execution status
- request history
- human approval workflows

Do not bypass approval semantics when building UI controls.

---

### `/api/hermes/tasks`

Purpose:
- mirrored Hermes operational task data

Known useful fields include:
- `board`
- `title`
- `assignee`
- `status`
- `priority`
- `result`
- timestamps / sync metadata

Use this as the primary starting point for the real Tasks operational board.

Historically this endpoint was real but sometimes empty because Hermes had no current Kanban tasks. An empty result is not permission to invent fake production tasks.

Inspect current data and reuse request infrastructure where appropriate.

---

### `/api/hermes/briefing`

Purpose:
- Chief of Staff / Hermes briefing data

Use this for:
- Chief of Staff summaries
- operational briefing surfaces
- current priorities / system summary where supported by the existing implementation

Inspect the route and existing briefing component before changing behavior.

---

## Other Hermes APIs

The repository has historically included additional Hermes endpoints such as:

- dispatch
- cost
- memory
- other operational helpers

Before creating a new API:
1. inspect `src/app/api/hermes`
2. inspect existing Prisma models
3. inspect reusable application components
4. reuse an existing route if it already models the required data safely

Do not create duplicate infrastructure unnecessarily.

## Known Legacy / Scaffold Data

### `/api/home.processes`

Do not use `/api/home.processes` as the production source for Active Agents.

The existing `/api/home` implementation historically returned an empty `processes` array in Vercel because the old process model depended on host-level process information unavailable in serverless production.

This source was intentionally removed from the Dashboard v1 Active Agents implementation.

### `/api/agents`

Historically the starter project exposed a hard-coded roster including:

- Max
- Sage
- Knox
- Nova
- Pixel

These are starter-project scaffolding, not the permanent Hermes workforce.

Do not present them as real production employees unless the project is explicitly changed to make them real.

A future permanent agent model should reflect actual agent identity, role, state, current work, permissions, memory, sessions, and activity.

## Data Integrity Rule

Never fabricate telemetry just to make a page look populated.

If real data is absent:

- show a truthful empty state
- explain what will populate the section
- preserve layout readiness
- use clearly labeled development fixtures only when the assigned task explicitly allows them

Real operational truth is more important than visual fullness.
