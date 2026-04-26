---
ID: US-CMP-FE-912
Title: Loading, success, and failure state standardization
Status: Done
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-912
Epic: CMP-E9: Auditability, Validation, and Error Recovery
---

As a user
I want clear action feedback so I do not accidentally duplicate writes.
So confidence and reliability improve.

Acceptance Criteria:
- [ ] All mutation buttons show busy/disabled state in-flight.
- [ ] Duplicate click submissions are prevented.
- [ ] Success feedback uses module-standard toast/message pattern.
- [ ] Failures show specific, non-generic error text.
- [ ] Stale-state conflicts trigger auto-refresh prompt.
