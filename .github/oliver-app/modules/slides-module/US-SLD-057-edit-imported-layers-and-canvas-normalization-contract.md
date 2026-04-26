---
ID: US-SLD-057
Title: Preserve Editability and Canonical Coordinates After Canvas Normalization
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want normalized canvas display without losing editable canonical coordinates
So edits, autosave, and export remain accurate after import

Acceptance Criteria:
- [ ] Imported text layers are selectable and directly editable.
- [ ] Imported image/shape/card layers are selectable and independently movable/resizable.
- [ ] Layer reorder, duplicate, and delete operations work on imported layers.
- [ ] Group moves are supported when grouping is enabled.
- [ ] Keyboard nudge controls apply to imported selections.
- [ ] Viewport scale is visually separate from canonical slide coordinates.
- [ ] Underlying SlideDocument coordinates remain canonical regardless of viewport zoom/fit mode.
- [ ] Autosave and export use canonical coordinates from JSON, not scaled preview coordinates.
