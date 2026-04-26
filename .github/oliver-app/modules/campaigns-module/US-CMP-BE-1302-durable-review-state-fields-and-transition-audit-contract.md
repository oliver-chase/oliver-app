---
ID: US-CMP-BE-1302
Title: Durable review state fields and transition audit contract
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-1302
Epic: CMP-PAR-E2: Workflow State and Review Durability
---

As a reviewer and auditor
I want review lifecycle metadata stored as first-class fields
So review ownership, timing, and outcomes are durable and queryable

Acceptance Criteria:
- [ ] Content records include review state fields: submitted, claimed, approved, changes requested actor/timestamps and feedback summary.
- [ ] Backend stores durable `review_status` aligned with lifecycle transitions.
- [ ] Request-changes action requires feedback payload and persists it consistently.
- [ ] Review comments model supports comment type and resolved/unresolved state.
- [ ] Activity logging captures review events with normalized metadata shape.
- [ ] Reporting queries can compute time-in-review and changes-requested counts from persisted fields.
