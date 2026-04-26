---
ID: US-SLD-054
Title: Support Proportional Canvas Resize Without Layout Reflow
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want canvas resizing to scale existing slides proportionally
So I can adapt dimensions without rebuilding layout manually

Acceptance Criteria:
- [ ] Resize operation scales all element positions and dimensions proportionally.
- [ ] Relative spacing/alignment remains stable after resize.
- [ ] Canonical coordinates are preserved consistently after transform.
- [ ] Resize from 1920x1080 to 1280x720 produces clean output without collisions/layout breakage.
- [ ] Resize behavior is non-responsive (no automatic flex/grid reflow in V1 path).
