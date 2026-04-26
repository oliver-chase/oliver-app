---
ID: US-O29
Title: Deliver HTML Import Visual Fidelity with Editable Componentization
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want imported HTML to look the same while becoming editable component objects
So I can preserve source design intent and still edit content/layout in Oliver

Acceptance Criteria:
- [ ] Import pipeline preserves layout, spacing, and typography semantics within agreed fidelity tolerance for supported HTML/CSS patterns.
- [ ] Parsed output creates editable component nodes (not static flattened text blobs) for text, containers, and common block structures.
- [ ] Imported text remains editable for content, font size, weight, color, and alignment controls in the editor.
- [ ] Unsupported constructs are surfaced as structured warnings with fallback behavior details, not silent degradation.
- [ ] Import preview clearly distinguishes supported editable elements vs locked/fallback-rendered elements.
- [ ] Regression fixtures include representative HTML templates and compare before/after render snapshots.

