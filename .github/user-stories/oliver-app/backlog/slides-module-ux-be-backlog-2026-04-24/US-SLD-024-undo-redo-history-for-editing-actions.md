---
ID: US-SLD-024
Title: Undo/Redo History for Editing Actions
Status: Missing
Verified: false
Backdated: 2026-04-24
---

As a slide editor user
I want reliable undo and redo across editing actions
So I can experiment safely without losing work

Acceptance Criteria:
- [ ] Undo/redo captures move, resize, text edit, and style updates.
- [ ] Keyboard shortcuts support undo/redo without interfering with active text entry.
- [ ] Text edits are snapshot-debounced to avoid one-history-entry-per-keystroke.
- [ ] History controls expose enabled/disabled state based on stack availability.

