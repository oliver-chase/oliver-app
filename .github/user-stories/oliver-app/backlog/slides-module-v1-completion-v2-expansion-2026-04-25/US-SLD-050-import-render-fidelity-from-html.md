---
ID: US-SLD-050
Title: Reconstruct Rendered HTML Slides With Render-First Import Fidelity
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want HTML import to reconstruct rendered slide output instead of DOM hierarchy
So I can start editing immediately without manual visual rebuild

Acceptance Criteria:
- [ ] Import executes in an isolated hidden iframe and does not parse raw DOM structure directly.
- [ ] Import waits for DOM ready, `document.fonts.ready`, image load completion, and layout settle before measurement.
- [ ] Slide root detection priority is `.page` then `[data-slide-root]` then `.slide-canvas` then `.slide` then `body`.
- [ ] Bounds are extracted with `getBoundingClientRect()` relative to slide root coordinates.
- [ ] Styles are extracted from `getComputedStyle()` (not inline-only style parsing).
- [ ] Layout-only wrappers are skipped as text layers.
- [ ] Import only includes visual leaf layers: direct-text leaves, images, and visually meaningful containers.
- [ ] Layout wrappers such as `.wrap`, `.left`, and `.right` are not imported as giant text layers when they carry no direct visual/text payload.
- [ ] Parent/child text duplication is prevented.
- [ ] If a node has child elements, only direct text node content is imported for that node; if all visible text is represented by child elements, parent text import is skipped.
- [ ] Visual cards/containers are preserved as editable shape/group-equivalent layers.
- [ ] `.art` card structures are preserved as container shape/group-equivalent layers with child text layers (`.an`, `.al`, `.ad`) extracted separately.
- [ ] `::before` accent bars are imported as thin shape layers when supported; otherwise importer emits warning and continues.
- [ ] Data URI images are supported.
- [ ] Imported slide background matches source instead of editor default fallback.
- [ ] Imported output for fixed-size sample slides preserves two-column/card/logo structure without overlap.

Notes:
- This story covers V1 critical import fidelity defects and parser correctness gates.

Progress Notes (2026-04-26):
- Added root-detection priority alignment: `.page` -> `[data-slide-root]` -> `.slide-canvas` -> `.slide` -> `body`.
- Added render-bound safeguard for oversized root measurements so body-level wrapper bounds do not compress imported output into tiny text/layout.
- Added regression coverage:
  - `SLD-FE-305` for `.page` root priority over lower-priority slide containers.
  - `SLD-FE-306` for oversized-root width normalization without tiny-text compression.
