# Hermy HQ / Hermes Mission Control — Coding Agent Guardrails

## Repository
Primary Mission Control repository:
`/root/hermes-agent-mission-control`

Current coding-agent working branch:
`codex/dashboard-step48`

Do not push directly to `main`.

## Core Architecture — Preserve
Hermy HQ / Vercel
↕
Supabase Postgres
↕
Hermes Bridge on Hostinger VPS
↕
Hermes Agent running in Docker

This architecture is already working and must not be rewritten or replaced for frontend work.

## Protected Infrastructure
- Preserve the working Hermes Agent runtime.
- Preserve the Hermes Bridge and its 24/7 systemd service.
- Preserve Supabase/Postgres integration.
- Preserve Google OAuth / authentication.
- Preserve the GitHub → Vercel deployment pipeline.
- Do not alter environment variables, credentials, secrets, OAuth configuration, database URLs, or deployment configuration unless explicitly requested.
- Never print or expose secrets.

## Backend / API Rules
Reuse existing Hermes APIs and data sources before creating new infrastructure.

Known operational sources include:
- `/api/hermes/health`
- `/api/hermes/activity`
- `/api/hermes/requests`
- `/api/hermes/crons`
- `/api/hermes/tasks`

Do not use `/api/home` process data as the source for Active Agents in production; its processes array is empty on Vercel.

`/api/agents` currently contains starter/scaffolding agents such as Max, Sage, Knox, Nova, and Pixel. These identities are temporary and must not be treated as the permanent Hermy HQ workforce. Future custom agents will replace them.

## Frontend Direction
Follow the approved 187N-inspired Mission Control visual hierarchy while preserving Hermy HQ's dark operational aesthetic.

Dashboard v1 hierarchy:
1. Reserve future hero/banner architecture without overbuilding hero artwork.
2. Operational KPI / system-status row.
3. Active Agents / workforce area.
4. Right-side Live Activity feed.
5. Upcoming Routines.
6. Requests / approvals / attention items where operationally useful.

Use real Hermes data rather than decorative or fake telemetry.

Preserve existing functionality until a replacement is proven.

## Current Roadmap
- Step 47 – Sidebar / Navigation: COMPLETE + PRODUCTION.
- Step 48 – Dashboard v1: COMPLETE + PRODUCTION + STABLE.
- Current: Build the safe automated Codex development pipeline.
- Next: Tasks.
- Then: Routines.
- Then: Agents + Activity.
- Then: Sessions + Skills read-only core views.
- Calendar / Chats: refine after the operational core.
- Do not prioritize empty Growth / Intelligence pages yet.
- Frontend polish / final 187-inspired theme comes later.
- After the operational core, move toward Telegram, n8n, integrations, and real automations.

## Change Safety
- Inspect before editing.
- Make scoped changes.
- Do not rewrite working backend infrastructure for frontend tasks.
- Preserve existing rollback / backup points.
- Do not delete old working routes or components merely because they are no longer visible.
- Avoid unrelated refactors.
- Do not modify production directly.
- Do not merge into `main`.
- Do not push to `main`.
- Do not deploy production without explicit human approval.

## Validation
Before declaring coding work complete:
1. Inspect the final diff.
2. Run `npm run build`.
3. Report whether the build passed or failed.
4. Summarize changed files and behavior.
5. Surface any risks, assumptions, or unresolved issues.
6. Wait for human review before merge or production deployment.

## Mission Control Context Pack

For any substantial Mission Control implementation, architecture change, or page build, read the repository-local context pack before editing:

`docs/codex-context/README.md`

Then read the relevant files in:

`docs/codex-context/`

The context pack contains:
- architecture and host-vs-Docker boundaries
- protected production systems
- real Hermes APIs and known scaffolding
- page-by-page product requirements
- August 29 visual-reference guidance
- current roadmap and unattended-development workflow

If documentation conflicts with the current repository or verified production behavior, inspect first and treat current working code/production behavior as the higher-confidence source.

Do not use the context pack as permission to weaken any safety rule in this file.
