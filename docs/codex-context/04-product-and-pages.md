# Mission Control Product and Page Requirements

Hermy HQ is an operational AI command center, not a decorative analytics dashboard.

Each page should help the user understand, control, review, or coordinate the Hermes system.

Use existing real data wherever possible. Do not invent fake operational activity to make pages look populated.

## Dashboard

Status:
- Step 48 Dashboard v1 is complete, deployed, and stable.

Purpose:
- provide a high-level operational cockpit
- show system health
- surface current work
- surface approvals/attention
- show recent Hermes activity
- show upcoming routines
- show Chief of Staff briefing information

Current production sections include:
- Hermes Health
- operational KPI row
- Chief of Staff briefing
- Active Agents / workforce
- Hermes Event Stream / Live Activity
- Upcoming Routines
- Approval Inbox

Do not casually redesign the dashboard during unrelated page work.

## Tasks

Purpose:
- become the central operational task board for work being performed by Hermes and future agents

Primary inputs:
- `/api/hermes/tasks`
- request / approval infrastructure
- existing reusable task / kanban components
- relevant Prisma models

Expected capabilities over time:
- real task columns / status mapping
- assignee
- priority
- task title / description
- execution/result context
- timestamps
- relationship to requests / approvals where useful
- truthful empty states when no tasks exist

Do not invent fake agent telemetry or fake tasks.

## Calendar

Purpose:
- provide a time-based view of operational commitments

Initial scope:
- scheduled routines
- upcoming automated jobs
- time-based system work

Later scope:
- meetings
- deadlines
- Google Calendar integration
- agent-related scheduled actions

Reuse routine/scheduling data before inventing a separate scheduling system.

## Routines

Purpose:
- dedicated control surface for recurring Hermes jobs and scheduled workflows

Primary source:
- `/api/hermes/crons`

Expected information:
- routine name
- status
- schedule
- next run
- last run
- last result
- delivery target
- mode
- script / skills metadata where useful
- recent run context

Controls may eventually include:
- run
- pause
- resume
- edit
- create
- remove

Respect approval requirements for side-effecting actions.

## Agents

Purpose:
- show the actual AI workforce and its operational state

Do not preserve the starter Max / Sage / Knox / Nova / Pixel roster as if it were real.

Future permanent agent model should eventually represent:
- agent identity
- role
- status
- current task
- recent activity
- permissions
- tools / skills
- memory
- sessions
- performance / history

Until a real registry exists, use only evidence supported by actual tasks, assignees, activity, or explicitly modeled agent state.

## Activity

Purpose:
- system-wide operational event stream

Primary source:
- `/api/hermes/activity`

Expected uses:
- Hermes / Bridge events
- execution events
- status changes
- task/routine/request events
- failures / warnings
- human-review context

Keep activity factual and timestamped.

## Sessions

Purpose:
- execution history for Hermes and future agents

Expected information:
- run / session identity
- agent
- task / request relationship
- status
- start / finish timestamps
- duration
- output
- errors
- model / token / cost telemetry later where real data exists

Start read-only unless the task explicitly requires controls.

## Skills

Purpose:
- surface the Hermes skills library and capability inventory

Initial scope:
- installed skills
- names
- descriptions
- categories
- availability / status
- relevant metadata

Start read-only.

Later scope may include:
- installing skills
- enabling/disabling
- assignment to agents
- configuration
- permissions

Do not build management actions before the underlying behavior is proven.

## Chats

Purpose:
- evolve toward a unified communications surface for Hermes

Future sources may include:
- Telegram
- email
- other communication channels
- direct Hermes conversations

Initial work should avoid pretending integrations exist before they are connected.

## Growth Pages

Current navigation includes areas such as:
- Revenue
- Analytics
- Competitors
- Social
- Integrations
- Research

These are intentionally secondary to the operational core.

Do not fill them with empty placeholder dashboards simply because routes exist.

Build them when real data sources and workflows exist.

## Intelligence Pages

Current navigation includes:
- Brain Dump
- Mind
- Activity
- Settings

Potential purposes:

### Brain Dump
- fast capture of thoughts, ideas, requests, or unstructured input for Hermes to process later

### Mind
- long-term knowledge, memory, relationships, concepts, or system intelligence visualization

### Settings
- operational configuration and preferences
- should not expose secrets
- should not casually mutate protected infrastructure

## Product Principle

Every page should answer at least one of these questions:

- What is happening?
- What needs attention?
- What is scheduled?
- What is being worked on?
- What happened?
- What can Hermes do?
- What should happen next?
- What can the user safely control?

Prefer operational usefulness over decorative completeness.
