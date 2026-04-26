---
ID: US-SLD-051
Title: Enforce SlideDocument JSON as Canonical Source of Truth
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want canvas, autosave, and export to run from one canonical SlideDocument JSON model
So edits remain consistent and deterministic across all operations

Acceptance Criteria:
- [ ] Import output is normalized into canonical SlideDocument JSON and stored in editor state.
- [ ] Canvas renderer reads only SlideDocument JSON state, never raw source HTML.
- [ ] Autosave persists SlideDocument JSON snapshots.
- [ ] Recovery mode restores SlideDocument JSON.
- [ ] Export workflows read SlideDocument JSON and do not depend on original imported HTML.
- [ ] Data model supports deck-level and slide-level shape (`SlideDeck` with `slides[]`, each slide with `elements[]` and optional `background`).

Reference Model:

```ts
type SlideDeck = {
  id: string
  width: number
  height: number
  slides: Slide[]
}

type Slide = {
  id: string
  elements: SlideElement[]
  background?: Background
}
```
