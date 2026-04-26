---
ID: US-OLV-057
Title: Handle chat provider failures
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a operator
I want clear chat errors when AI is unavailable
So that I understand whether the problem is config, provider, or network

Acceptance Criteria:
- [ ] /api/chat returns 400 for missing messages.
- [ ] Missing API key returns a 503 message instructing admins to add one.
- [ ] AI call failures return an error string.
- [ ] Client network errors show Network error. Try again.

Notes: Failure handling is user-visible inside OliverDock.
---
