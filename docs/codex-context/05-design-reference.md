# Hermy HQ Visual and Design Reference

The August 29 Hermy Dashboard reference PDF is the primary structural inspiration for future Mission Control pages.

It is a design reference, not a literal specification.

Codex should borrow:
- hierarchy
- density
- information architecture
- card structure
- page composition
- operational layout patterns
- relationships between summary data and detailed controls

Do not blindly copy:
- fake metrics
- placeholder content
- exact colors from the light-theme examples
- exact labels that do not fit Hermes
- decorative data with no real source

Hermy HQ should preserve its own dark operational identity.

## Overall Aesthetic

The target feel is:

- dark
- cinematic
- operational
- AI command-center oriented
- dense but readable
- restrained blue / purple emphasis
- subtle borders
- clear hierarchy
- compact information-rich cards
- useful status signals without excessive decoration

The UI should feel like an operating system for an AI workforce rather than a marketing dashboard.

## Reference Page 1 — Cinematic Hermes Direction

Use for:
- future hero/banner concepts
- overall mood
- dark blue/purple AI-operator aesthetic
- strong Mission Control identity

Do not prioritize final hero artwork over operational functionality.

## Reference Page 2 — Main Mission Control Dashboard

Use for:
- overall dashboard hierarchy
- dense executive cockpit composition
- summary metrics above deeper operational sections
- clear system-status framing
- balanced center content and side information

Hermy HQ Dashboard v1 already exists and is stable. Do not rebuild it simply to match this screenshot.

## Reference Page 4 — Tasks and Calendar

### Tasks

Useful structural ideas:
- top-level task metrics
- filters / status selectors
- kanban-style board
- compact task cards
- visible assignee / status / priority metadata
- operational detail without oversized cards

For Hermy HQ:
- use real Hermes task data
- use truthful empty states
- connect approvals/request state when relevant
- avoid fake productivity metrics

### Calendar

Useful structural ideas:
- high-level schedule summary
- timeline / calendar visualization
- upcoming items grouped around time
- side panel for selected or upcoming events

For Hermy HQ:
- routines/scheduled jobs come first
- meetings/deadlines can be added later
- Google Calendar belongs in a later integration phase

## Reference Page 5 — Routines

Useful structural ideas:
- routine summary at top
- next-run prominence
- timeline / trend area where real history exists
- list/table of routines below
- status controls aligned with each routine
- dense operational rows instead of oversized cards

For Hermy HQ:
- source data from `/api/hermes/crons`
- show real schedule, status, next run, last run/result, delivery and mode
- only expose controls already supported safely
- respect request/approval infrastructure

## Reference Page 6 — Chats and Sessions

### Chats

Useful structural ideas:
- communications overview metrics
- conversation list
- selected conversation detail
- channel/source context
- compact communication workspace

Hermy HQ should not fake Telegram/email channels before integrations exist.

### Sessions

Useful structural ideas:
- execution summary
- trend/history visualization where real data exists
- session list
- status/duration/output detail
- compact filters

Start with factual read-only execution history.

## Reference Page 7 — Skills

Useful structural ideas:
- skills overview / health summary
- searchable or filterable capability cards
- installed-skill metadata
- status / usage information
- detailed selected-skill view later

For Hermy HQ:
- begin read-only
- show only real installed skills and metadata
- management controls come later

## Reference Page 8 — Social and Analytics

These pages are later-stage Growth surfaces.

Useful structural ideas:
- clear primary KPI
- time-series chart
- supporting metrics
- account/source breakdowns
- lower-level analytical cards

Do not build these pages until real business/social data sources exist.

## Reference Page 9 — Integrations and Research

### Integrations

Useful structural ideas:
- connectivity/status overview
- connected tools
- health/status
- configuration entry points

Do not expose secrets.

### Research

Useful structural ideas:
- topic/feed list
- filters
- selected research detail
- summarized insight panel
- source-backed intelligence

Research should become useful once real workflows/data sources are connected.

## Reference Page 10 — Brain Dump and Mind

### Brain Dump

Useful structural ideas:
- large fast-input area
- minimal friction
- recent captured items
- processing / status indicators

Purpose:
quickly give Hermes raw thoughts, requests, ideas, or notes for later processing.

### Mind

Useful structural ideas:
- knowledge graph / relationship view
- memory summary
- recent learning
- related concepts
- searchable knowledge

Do not invent a visual knowledge graph unless real relationships/data support it.

## Reference Page 11 — Activity and Settings

### Activity

Useful structural ideas:
- large chronological event stream
- event type filters
- status/agent breakdowns
- system summary metrics

Primary Hermy HQ source:
`/api/hermes/activity`

### Settings

Useful structural ideas:
- system summary
- organized settings categories
- clear operational controls
- status visibility

Settings must not reveal secrets or casually modify protected production infrastructure.

## Responsive Design

Desktop can use dense multi-column layouts.

Smaller screens should:
- stack clearly
- preserve hierarchy
- avoid horizontal overflow
- keep critical status and attention information visible
- prioritize useful operational information over decorative elements

## Final Design Rule

Use the reference to answer:

"What information should be visible together, and what hierarchy makes this page useful?"

Do not ask:

"How can we make Hermy HQ look exactly like the screenshot?"

Hermy HQ should remain visually its own dark Mission Control system while borrowing the strongest structural ideas from the reference.
