# Mission Control Architecture

## Core architecture

The production system is organized as:

Hermy HQ / Vercel
-> Supabase Postgres
-> Hermes Bridge on the VPS host
-> Hermes Agent inside Docker

Hermy HQ is the web-based operational control plane. It does not directly run the Hermes Agent.

## Hermy HQ / Vercel

- Hermy HQ is a Next.js application.
- Production is hosted on Vercel.
- The Mission Control repository lives on the VPS at:
  `/root/hermes-agent-mission-control`
- GitHub is the source-control path used for production deployment.
- Approved changes eventually flow:
  VPS Git branch -> GitHub -> Vercel -> Production
- Google OAuth protects access to the production dashboard.

## Supabase Postgres

Supabase Postgres is the shared persistence and coordination layer between Hermy HQ and the Hermes Bridge.

It stores operational data including Hermes health, activity, requests, tasks, cron/routine state, briefing data, and other application records exposed through Prisma-backed APIs.

The production Vercel application uses the Supabase Transaction Pooler for Prisma/serverless compatibility.

## Prisma

Prisma is used by the Mission Control application to query and mutate the Postgres database.

Production database connectivity is a protected part of the architecture. Do not replace or casually rewrite the Prisma/Supabase connection strategy during ordinary feature work.

## Hermes Bridge

The Hermes Bridge runs on the VPS host as an always-on systemd service.

Its role includes:

- polling queued/approved AgentRequest records
- invoking the real Hermes Agent
- writing execution results/status back to Postgres
- mirroring Hermes health
- mirroring Hermes tasks
- mirroring cron/routine information
- writing operational AgentEvent activity
- supporting Chief of Staff briefing synchronization

The Bridge is infrastructure, not a frontend helper. Ordinary UI work should consume the data it produces rather than rewriting the Bridge.

## Hermes Agent

The live Hermes Agent runs inside Docker.

Important separation:

- VPS host: Mission Control repository, Hermes Bridge, Git/Codex tooling
- Docker container: Hermes Agent runtime

Do not confuse `/opt/hermes` inside Docker with the Mission Control Git repository.

The Mission Control repository is:

`/root/hermes-agent-mission-control`

The Hermes deployment/container environment is separate.

## Host-to-Docker execution

The Bridge uses the existing Hermes Docker deployment rather than installing a second Hermes runtime on the host.

A host-side wrapper forwards Hermes CLI calls into the running Docker container.

Preserve this separation unless an architectural task explicitly requires changing it.

## Authentication

Production Hermy HQ is protected with Google OAuth / NextAuth.

Authentication configuration, authorized-user configuration, callback URLs, client credentials, and related production environment settings are protected infrastructure.

Do not modify authentication merely to solve unrelated frontend problems.

## Deployment path

The established production path is:

Development on isolated Git branch
-> validation/build
-> human review
-> approved merge to main
-> push to GitHub
-> Vercel automatic deployment

Codex must never bypass the human approval step.

## Architectural principle

Prefer extending the existing system over replacing working infrastructure.

For feature work:

1. inspect existing routes, APIs, Prisma models, and components
2. reuse real operational data
3. make the smallest coherent implementation
4. validate independently
5. stop for human review before production
