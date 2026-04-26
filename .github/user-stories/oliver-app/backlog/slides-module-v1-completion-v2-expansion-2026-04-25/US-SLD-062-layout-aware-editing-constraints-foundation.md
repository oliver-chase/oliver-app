---
ID: US-SLD-062
Title: Add Layout Constraint Foundation (Stack, Row, Grid, Pinned)
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want optional layout-aware controls in addition to absolute positioning
So grouped content stays aligned as I edit and resize

Acceptance Criteria:
- [ ] Default editing mode remains absolute positioning for backward compatibility.
- [ ] Optional layout constraints support `stack`, `row`, `grid`, and `pinned` behaviors.
- [ ] Constraint metadata supports alignment and spacing/gap settings.
- [ ] Columns, stacks, cards, and grids can be managed without manual coordinate updates.
- [ ] Pinned elements keep intended anchors when canvas dimensions change.

Reference Model:

```ts
type LayoutConstraint = {
  type: 'stack' | 'row' | 'grid' | 'pinned'
  alignment?: 'left' | 'center' | 'right'
  gap?: number
}
```
