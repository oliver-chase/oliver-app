---
ID: US-OLV-046
Title: Undo soft deletes
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a operator
I want a short undo window after supported deletes
So that I can recover from accidental removals

Acceptance Criteria:
- [ ] useSoftDelete removes the item optimistically.
- [ ] Undo restores the pending item before expiry.
- [ ] Expiry calls the supplied permanent delete callback.
- [ ] Delete failures are logged and do not crash the page.

Notes: Used across selected account and HR deletion flows.
---
