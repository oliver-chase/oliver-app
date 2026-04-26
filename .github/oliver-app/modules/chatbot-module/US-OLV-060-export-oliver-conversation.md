---
ID: US-OLV-060
Title: Export Oliver conversation
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Introduce shared OliverDock and upload flows

As a operator
I want to download the current Oliver conversation
So that I can preserve chat context outside the app

Acceptance Criteria:
- [ ] Export is enabled only when message items exist.
- [ ] The export file contains user and Oliver messages in order.
- [ ] The downloaded filename includes the current date.
- [ ] Object URLs are revoked after download.

Notes: Parse cards and write prompts are not included as normal chat messages.
---
