---
ID: SLD-FE-500
Title: PPTX Export UX (Single and Multi-Slide)
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a slide editor user
I want to export one or multiple slides to PPTX from the module
So I can deliver editable decks without leaving the slides workflow

Acceptance Criteria:
- [x] Import workspace supports single-slide PPTX export for the active slide.
- [x] My Slides supports multi-select export controls with clear selected-count state.
- [x] Export flow surfaces warnings report for unsupported component mappings.
- [x] Success/failure states are actionable and write audit events for PPTX exports.
- [x] Chat command coverage includes PPTX export initiation without dead-end follow-up.

Evidence:
- Single-slide current export, warning surfacing, and download behavior are validated by `tests/e2e/slides-regression.spec.ts` (`SLD-FE-500 exports current slide to PPTX and surfaces unsupported-component warnings`).
- Multi-select My Slides export with selected-count button state and `export-pptx` activity recording is validated by `tests/e2e/slides-regression.spec.ts` (`SLD-FE-500 exports selected My Slides rows to one PPTX and records export-pptx activity`).
