---
ID: US-CMP-BE-510
Title: Claim/unclaim transactional logic
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-510
Epic: CMP-E5: Claiming, Scheduling, and Posting Execution
---

As a system
I want atomic claim and unclaim operations so two users cannot own the same content.
So ownership remains unambiguous.

Acceptance Criteria:
- [ ] Only `unclaimed` items are claimable.
- [ ] Claim always sets posting owner to current actor unless admin override route is used.
- [ ] Duplicate claim attempts fail with conflict response.
- [ ] Unclaim clears owner/schedule and cancels pending reminders.
- [ ] Claim/unclaim actions are fully logged.
