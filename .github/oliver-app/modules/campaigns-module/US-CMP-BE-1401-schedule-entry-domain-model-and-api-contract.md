---
ID: US-CMP-BE-1401
Title: Schedule entry domain model and API contract
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-1401
Epic: CMP-PAR-E3: Scheduling and Reminders Operational Backbone
---

As a campaign operations lead
I want scheduling stored as dedicated schedule entries with status history
So publish planning and rescheduling are auditable and decoupled from content row mutations

Acceptance Criteria:
- [ ] Backend adds schedule entry table with fields for content, campaign, channel, scheduled timestamp, timezone, status, and audit timestamps.
- [ ] Scheduling statuses support at least: `scheduled`, `rescheduled`, `posted`, `missed`, `canceled`.
- [ ] Schedule APIs create and update entries without orphaning content linkage.
- [ ] Reschedule operation preserves prior schedule history in activity logs.
- [ ] Content lifecycle and schedule status remain synchronized through server-enforced transitions.
- [ ] Calendar/report queries consume schedule entries as source of truth.
