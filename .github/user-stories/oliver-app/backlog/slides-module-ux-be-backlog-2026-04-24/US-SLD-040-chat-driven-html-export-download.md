---
ID: US-SLD-040
Title: Chat-Driven HTML Export Download
Status: Code Present
Verified: true
Backdated: 2026-04-25
---

As a slide editor user
I want an Oliver command that directly downloads HTML export
So export workflows do not dead-end after generation and remain fully executable in chat

Acceptance Criteria:
- [x] Slides commands include a fuzzy-discoverable `Download HTML Export` intent.
- [x] Chat flow runs direct HTML download and returns a completion confirmation message.
- [x] Command execution reuses existing export behavior and audit logging contract when a saved slide is active.
- [x] Frontend smoke test verifies command-triggered download and success confirmation.
