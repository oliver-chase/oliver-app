---
ID: US-SLD-081
Title: Flexbox Layout Resolution Parity for PPTX
Status: Backlog
Verified: false
Backdated: 2026-04-26
---

As a slide export user
I want flexbox-driven DOM layout resolved to stable PPTX coordinates
So element positioning does not shift between HTML canvas and exported deck

Acceptance Criteria:
- [ ] Row/column flex containers export with coordinate fidelity for `justify-content`, `align-items`, and `gap`.
- [ ] Nested flex containers resolve child offsets without cumulative drift.
- [ ] Text and shape boxes in flex contexts maintain expected size/alignment after export.
- [ ] Unsupported flex behaviors emit explicit warning entries instead of silent fallback.
- [ ] Regression fixtures include deep nested flex scenarios (including Tailwind-like utility class layouts).
