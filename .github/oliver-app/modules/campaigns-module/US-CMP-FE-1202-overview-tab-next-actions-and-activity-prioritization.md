---
ID: US-CMP-FE-1202
Title: Overview tab next-actions and activity prioritization
Status: Done
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-1202
Epic: CMP-PAR-E1: Workspace IA and Context Integrity
---

As a campaign manager
I want an overview tab that prioritizes next actions and recent activity
So I can quickly decide what needs attention first

Acceptance Criteria:
- [x] Overview tab includes campaign snapshot cards with status, owner, date range, channels, and lifecycle counts.
- [x] Next Actions panel ranks urgent work first (review items, approved-unscheduled, overdue reminders, blocked items, missing metadata).
- [x] Each next-action item deep-links to the relevant filtered workspace view or content item.
- [x] Recent activity feed is scannable, time-ordered, and clearly distinguishes user actions from system events.
- [x] Empty overview states explicitly communicate when campaign operations are up to date.
- [x] Overview is available at a stable route and passes mobile readability checks.

Execution Update (2026-04-26):
- Added `Next Actions` overview panel that prioritizes review backlog, approved-unscheduled queue, overdue reminders, and missing metadata actions with direct deep-links into target workspaces.
- Added `Recent Activity` panel for selected campaign context with ordered event rows and actor/entity context to keep overview decision-first.
- Added explicit empty-state messaging when no urgent actions or activity items are present.
