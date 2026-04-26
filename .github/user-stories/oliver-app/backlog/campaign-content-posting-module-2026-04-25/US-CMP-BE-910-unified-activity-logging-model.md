---
ID: US-CMP-BE-910
Title: Unified activity logging model
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-910
Epic: CMP-E9: Auditability, Validation, and Error Recovery
---

As an admin
I want a complete activity trail so I can audit campaign operations and resolve disputes.
So state history is transparent.

Acceptance Criteria:
- [ ] All state-changing actions write `campaign_activity_log`.
- [ ] Log includes actor, action, entity, timestamp, metadata snapshot.
- [ ] System actor entries are supported for jobs.
- [ ] Admin can view logs via scoped query.
- [ ] Unauthorized users cannot read sensitive log metadata.
