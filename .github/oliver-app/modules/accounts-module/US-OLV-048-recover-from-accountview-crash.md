---
ID: US-OLV-048
Title: Recover from AccountView crash
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a maintainer
I want an account detail error boundary
So that section crashes show a useful diagnostic instead of blanking the app

Acceptance Criteria:
- [ ] AccountView is wrapped in an ErrorBoundary.
- [ ] Thrown render errors show a red diagnostic message.
- [ ] The message includes the crash text.
- [ ] Other app chrome remains mounted.

Notes: Marked as temporary in commit history but still present.
---
