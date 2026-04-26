---
ID: US-OLV-111
Title: Refresh module data from Oliver
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Introduce shared OliverDock and upload flows

As a operator
I want chat workflows to refresh module state after writes
So that the UI reflects assistant-driven changes

Acceptance Criteria:
- [ ] Accounts Oliver config provides onChatRefresh that refetches account data.
- [ ] HR Oliver config provides onChatRefresh that reloads HR data.
- [ ] SDR Oliver config provides onChatRefresh that reloads SDR data.
- [ ] Import commits call onChatRefresh after successful writes.

Notes: Refresh behavior is callback-based per module.
---
