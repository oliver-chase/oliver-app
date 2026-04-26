---
ID: US-O29
Title: Deliver HTML Import Visual Fidelity with Editable Componentization
Status: In Progress
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

Progress notes (2026-04-26):
- Added HTML + companion CSS bundle import path in Slides (`.html` with optional `.css` selected together), inlining matched linked stylesheets before parse.
- Parser render snapshot now clones document body/html context (not only the root node), improving fidelity for selectors that depend on `body`/ancestor context.
- Added end-to-end coverage for companion stylesheet import (`SLD-FE-303`).
