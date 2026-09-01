# Protected Systems and Safety Boundaries

These systems are known-working production infrastructure. Ordinary feature work must not casually rewrite, replace, or reconfigure them.

## 1. Hermes Agent Runtime

The live Hermes Agent runs inside the existing Docker deployment.

Do not:

- install a second Hermes runtime to solve a Mission Control problem
- rewrite the Hermes runtime for ordinary frontend work
- modify container configuration unless the assigned task explicitly requires it
- assume the Mission Control repository is inside `/opt/hermes`

Preserve the existing host-to-Docker separation.

## 2. Hermes Bridge

The Hermes Bridge runs on the VPS host as an always-on systemd service.

It is already proven to:

- communicate with the live Hermes Agent
- process AgentRequest work
- write results back to Postgres
- mirror health, tasks, routines, and activity
- support briefing synchronization
- survive terminal/browser disconnection and VPS reboot

Do not casually rewrite `hermes-bridge/bridge.mjs`, its systemd service, its environment file, or its Hermes CLI wrapper during unrelated application work.

## 3. Production Database Architecture

Production uses Supabase Postgres.

Hermy HQ accesses the database through Prisma.

Vercel production uses the Supabase Transaction Pooler.

A previous production instability was caused by Prisma prepared-statement collisions through the pooler. The working production connection preserves the existing pooler URL and includes:

`pgbouncer=true&connection_limit=1`

Do not remove these compatibility parameters or replace the working database connection architecture during ordinary feature work.

Never print, log, commit, or expose database credentials.

## 4. Google OAuth / Authentication

Production Hermy HQ is protected by Google OAuth / NextAuth and an authorized-user configuration.

Do not casually change:

- OAuth client configuration
- callback URLs
- authentication providers
- access allowlists
- NextAuth secrets
- authentication-related production environment variables

Authentication changes require explicit task scope and careful validation.

## 5. GitHub -> Vercel Deployment Pipeline

The established production deployment path is:

approved `main`
-> GitHub
-> Vercel
-> production Hermy HQ

Codex must not:

- merge directly to `main`
- push unreviewed implementation to `main`
- deploy directly to production
- bypass the human approval checkpoint
- rewrite the deployment pipeline to make feature implementation easier

Work must remain on isolated `codex/*` branches until approved.

## 6. Production Secrets and Environment Configuration

Never expose or commit:

- database passwords or complete secret-bearing connection strings
- OAuth client secrets
- NextAuth secrets
- API keys
- tokens
- private SSH keys
- service environment credentials
- other sensitive production values

Do not dump `.env`, Vercel environment values, or system service environment files into logs or review artifacts.

When inspecting configuration, prefer variable names, masked values, or presence checks.

## 7. Existing Production Behavior

Known-working production behavior should be preserved unless the assigned task explicitly changes it.

Before touching infrastructure:

1. prove the feature cannot be implemented safely using existing APIs/components
2. identify the exact infrastructure limitation
3. document the proposed change and risk
4. stop for human approval if the change affects protected production architecture

## Safety Principle

Feature development should normally change the application layer, not the control-plane infrastructure beneath it.

When uncertain, preserve the working system and report the uncertainty for human review.
