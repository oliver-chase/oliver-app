---
ID: US-CMP-BE-1012
Title: Idempotency and dedupe for reminders/exports
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-1012
Epic: CMP-E10: Performance and Scale Hardening
---

As an operator
I want repeated job triggers to be safe so retries do not create duplicates.
So operational reliability improves.

Acceptance Criteria:
- [ ] Reminder send job dedupes on idempotency key.
- [ ] Export job dedupes or supersedes duplicate pending requests per filter signature.
- [ ] Retry policies are bounded and logged.
- [ ] Failed jobs preserve actionable error reason.
- [ ] Manual rerun path exists for admins.
