---
ID: US-SLD-080
Title: DOM→PPTX Computed Style Mapping Foundation
Status: Backlog
Verified: false
Backdated: 2026-04-26
---

As a slide export user
I want DOM nodes mapped to PPTX using computed browser styles
So exported decks preserve authored layout/styles without raster screenshot fallback

Acceptance Criteria:
- [ ] Export pipeline reads computed style values for text, box model, paint, and transform properties before PPTX projection.
- [ ] Mapping contract is deterministic for identical DOM/CSS inputs (stable shape/text output ordering).
- [ ] Unsupported mappings are surfaced as structured warnings with affected node references.
- [ ] Export contract preserves editable object output as default behavior, not bitmap screenshots.
- [ ] Contract tests cover baseline style-mapping correctness for representative DOM fixtures.
