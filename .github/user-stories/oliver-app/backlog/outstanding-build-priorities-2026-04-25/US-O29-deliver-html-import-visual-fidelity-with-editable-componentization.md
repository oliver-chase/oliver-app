---
ID: US-O29
Title: Deliver HTML Import Visual Fidelity with Editable Componentization
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a slide editor user
I want imported HTML to look the same while becoming editable component objects
So I can preserve source design intent and still edit content/layout in Oliver

Acceptance Criteria:
- [x] Import pipeline preserves layout, spacing, and typography semantics within agreed fidelity tolerance for supported HTML/CSS patterns.
- [x] Parsed output creates editable component nodes (not static flattened text blobs) for text, containers, and common block structures.
- [x] Imported text remains editable for content, font size, weight, color, and alignment controls in the editor.
- [x] Unsupported constructs are surfaced as structured warnings with fallback behavior details, not silent degradation.
- [x] Import preview clearly distinguishes supported editable elements vs locked/fallback-rendered elements.
- [x] Regression fixtures include representative HTML templates and compare before/after render snapshots.
- [x] Linked stylesheet payloads are imported with DOM order preserved against inline style blocks so cascade and specificity semantics remain stable.

Epic linkage:
- Parent epic: O29 "Visual fidelity for editable HTML imports"
- Capability thread: import style-order preservation when multiple style mechanisms coexist.

Tickets:
- SLD-FE-310: Preserve `<style>` and `<link rel="stylesheet">` order during HTML import snapshotting.
- SLD-TE-311: Add regression test for cascading order (`external stylesheet` + `inline style`) so later inline rules do not get accidentally overridden.
- Ticket files:
  - [SLD-FE-310-style-cascade-order-preservation-for-imported-html](/Users/oliver/projects/oliver-app/.github/user-stories/oliver-app/backlog/slides-module-ux-be-backlog-2026-04-24/SLD-FE-310-style-cascade-order-preservation-for-imported-html.md)
  - [SLD-TE-311-style-order-regression-coverage](/Users/oliver/projects/oliver-app/.github/user-stories/oliver-app/backlog/slides-module-ux-be-backlog-2026-04-24/SLD-TE-311-style-order-regression-coverage.md)

Progress notes (2026-04-26):
- Added HTML + companion CSS bundle import path in Slides (`.html` with optional `.css` selected together), inlining matched linked stylesheets before parse.
- Parser render snapshot now clones document body/html context (not only the root node), improving fidelity for selectors that depend on `body`/ancestor context.
- Added end-to-end coverage for companion stylesheet import (`SLD-FE-303`).
- Added fallback-mode import distinction: unsupported top-level fallback nodes are now clearly labeled and locked to preserve visual fidelity (`SLD-FE-304`).

Implementation Evidence (2026-04-26):
- Parser fidelity and fallback behavior:
  - `src/components/slides/html-import.ts`
  - flow/bounds import path with computed-style extraction and fallback-node lock labeling (`(fallback)` + `locked: true` when fallback mode is used)
- Regression coverage:
  - `tests/e2e/slides-regression.spec.ts`
    - `US-SLD-013 fixture round-trip keeps component count and coordinate drift within tolerance`
    - `SLD-FE-300 imports class-based CSS layout, colors, and typography from HTML slides`
    - `SLD-FE-301 imports nested flow-layout HTML into multiple styled layers`
    - `SLD-FE-303 imports HTML with companion CSS files selected together`
    - `SLD-FE-304 marks fallback-rendered imports as locked and clearly labeled`
