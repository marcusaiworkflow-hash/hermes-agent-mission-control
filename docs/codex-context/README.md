# Hermy HQ / Mission Control — Codex Context Pack

This directory contains the permanent project context Codex should use when performing substantial work on Hermy HQ / Mission Control.

## Purpose

Codex does not have access to the project's ChatGPT conversations, progress-log PDFs, or visual-reference PDFs. These files preserve the important architecture, product decisions, safety boundaries, data sources, design direction, and roadmap inside the repository.

## Required reading order

Before substantial Mission Control work, read:

1. `01-architecture.md`
2. `02-protected-systems.md`
3. `03-data-and-apis.md`
4. `04-product-and-pages.md`
5. `05-design-reference.md`
6. `06-roadmap-and-workflow.md`

Also obey the repository-level `AGENTS.md`.

## Source-of-truth rules

- Inspect the current repository before editing.
- Running code and current production behavior take precedence over stale documentation.
- Preserve known-working architecture unless the task explicitly requires architectural change.
- Reuse existing APIs, models, and components before inventing replacements.
- Never fabricate operational telemetry or metrics merely to match a visual reference.
- Historical screenshots are design references, not literal specifications.
- Never expose secrets or credentials.
- Never merge, push, or deploy directly to production without explicit human approval.

## Current project objective

Build Hermy HQ into the operational control plane for Hermes while enabling Codex to perform substantial development autonomously on isolated branches.

Target development workflow:

task/spec -> isolated Codex branch -> implementation/iteration -> build/tests -> audit/review output -> human approval -> merge/deploy
