---
ID: US-SLD-060
Title: Introduce Template System for Reusable Structured Slides
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want to save and reuse slide templates with structural controls
So I can create consistent decks faster without breaking layout intent

Acceptance Criteria:
- [ ] User can save imported slides and edited slides as templates.
- [ ] User can apply a template to create a new slide instance.
- [ ] User can duplicate templates.
- [ ] Team template sharing workflow is supported.
- [ ] Template model supports locked elements and editable zones.
- [ ] Locked elements cannot be structurally modified in derived slides.
- [ ] Editable zones support text and image replacement while preserving structure.
- [ ] Reusable layout blocks are supported for rapid composition.

Reference Model:

```ts
type Template = {
  id: string
  baseSlide: Slide
  lockedElements?: string[]
  editableZones?: string[]
}
```
