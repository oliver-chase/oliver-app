# QA — HR Page

**Status:** Partial port. Dashboard, Hiring, Directory fully functional. 7 sections are stubs.

## What's ported
- Dashboard: stat row (active reqs, employees, onboarding, offboarding), upcoming starts card, recent candidates card
- Hiring: kanban view (all stages, candidate cards with status badges), table view, filter by stage/status/search
- Directory: filterable employee table (search, dept, status filters), pagination

## Stubs (in progress)
- Onboarding: placeholder only
- Offboarding: placeholder only
- Inventory: placeholder only
- Assignments: placeholder only
- Tracks: placeholder only
- Reports: placeholder only
- Settings: placeholder only

## Known gaps / tech debt
- Command Palette (Cmd+K global search) — deferred; no source port yet
- Global Search modal — deferred
- Candidate detail slide-in panel — hiring kanban shows cards but no detail view on click
- AI Intake button — HR-specific feature, exists in ops-dashboard hr/js/aiintake.js; not ported
- Onboarding/offboarding run task checklist — complex state machine; deferred
- Inventory + Assignments — device tracking; deferred
- Tracks — onboarding track builder; deferred
- Reports — headcount/pipeline analytics; deferred
- Settings — org config; deferred
