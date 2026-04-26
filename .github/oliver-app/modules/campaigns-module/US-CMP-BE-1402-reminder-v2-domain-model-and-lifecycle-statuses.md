---
ID: US-CMP-BE-1402
Title: Reminder v2 domain model and lifecycle statuses
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-1402
Epic: CMP-PAR-E3: Scheduling and Reminders Operational Backbone
---

As a campaign manager
I want reminders modeled as operational tasks instead of delivery-only events
So follow-ups can be assigned, snoozed, completed, and reported consistently

Acceptance Criteria:
- [ ] Reminder domain supports required fields: title, campaign, optional content, assigned user, due timestamp, notes, created/updated/completed metadata.
- [ ] Reminder statuses support: `open`, `snoozed`, `completed`, `canceled`, `overdue`.
- [ ] Reminder APIs support create, edit, complete, reassign, snooze, and delete operations with permission checks.
- [ ] Reminder completion writes `completed_at` and activity log event.
- [ ] Overdue classification is deterministic and queryable without frontend-only inference.
- [ ] Existing reminder pathways have compatibility handling during migration.
