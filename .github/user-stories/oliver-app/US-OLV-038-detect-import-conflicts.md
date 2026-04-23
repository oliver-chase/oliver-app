---
ID: US-OLV-038
Title: Detect import conflicts
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Chatbot, voice, and module flows

As a account operator
I want write conflicts detected before imported content is committed
So that meeting imports do not silently overwrite or duplicate important records

Acceptance Criteria:
- [ ] A dry-run path can compare incoming payloads against existing account records.
- [ ] The write endpoint can block or flag conflicts before persisting data.

Notes: Conflict detection exists in `/api/confirm-write`; I did not verify all duplicate-detection heuristics.
---
