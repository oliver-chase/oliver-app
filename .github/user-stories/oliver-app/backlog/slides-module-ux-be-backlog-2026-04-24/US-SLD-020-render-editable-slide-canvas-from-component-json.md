---
ID: US-SLD-020
Title: Render Editable Slide Canvas From Component JSON
Status: Missing
Verified: false
Backdated: 2026-04-24
---

As a slide editor user
I want imported component JSON rendered on a canonical editable canvas
So I can transition from parsing into real on-canvas editing

Acceptance Criteria:
- [ ] Slide canvas renders from `SlideComponent[]` data in a 1920x1080 internal coordinate space.
- [ ] Canvas scales to viewport while preserving 16:9 ratio and coordinate integrity.
- [ ] Imported component types map to visible editable layer renderers.
- [ ] Rendering uses module tokens and does not introduce off-system visual values.

