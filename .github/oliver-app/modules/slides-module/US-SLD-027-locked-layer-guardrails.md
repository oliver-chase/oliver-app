---
ID: US-SLD-027
Title: Locked Layer Guardrails Across Editor Actions
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a slide editor user
I want locked layers to remain immutable during direct manipulation and toolbar actions
So accidental edits cannot modify protected content

Acceptance Criteria:
- [x] Locked layers cannot enter inline edit mode from keyboard or pointer interactions.
- [x] Locked layers do not expose resize handles and are skipped for drag/nudge updates.
- [x] Alignment, distribution, and style-toolbar actions skip locked layers while still applying to unlocked selected layers.
- [x] UI feedback explains when locked layers are skipped.
