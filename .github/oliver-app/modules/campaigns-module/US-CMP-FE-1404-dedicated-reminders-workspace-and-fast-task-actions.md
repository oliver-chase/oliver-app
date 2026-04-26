---
ID: US-CMP-FE-1404
Title: Dedicated reminders workspace and fast task actions
Status: In Progress
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-1404
Epic: CMP-PAR-E3: Scheduling and Reminders Operational Backbone
---

As a campaign operator
I want a dedicated reminders workspace with quick task actions
So follow-ups are managed intentionally instead of hidden inside calendar controls

Acceptance Criteria:
- [ ] Workspace includes a dedicated Reminders tab with task-like row layout.
- [ ] Reminder rows show title, campaign, optional content, assigned user, due date, status, and notes preview.
- [ ] Users can create, edit, mark complete, reassign, snooze, and delete reminders from this surface.
- [ ] Overdue reminders are visually prominent and completed reminders are visually subdued.
- [ ] Reminder create/edit interactions are fast-path friendly and do not require full-page context switches.
- [ ] Reminders tab supports empty, loading, and error states with clear recovery actions.

Execution Update (2026-04-26):
- Added dedicated `/campaigns/reminders` route and sidebar tab.
- Added reminders workspace with task-like rows, overdue/completed visual treatment, and inline fast actions (create/edit draft, mark complete, snooze +24h, reassign to me, delete).
- Added reminder data layer support (`list`, `update`, `delete`) in `src/lib/campaigns.ts` and wired workspace state hydration into campaign load flow.
