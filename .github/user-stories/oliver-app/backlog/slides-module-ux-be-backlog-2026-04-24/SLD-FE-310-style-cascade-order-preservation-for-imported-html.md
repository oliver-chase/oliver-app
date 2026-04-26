---
ID: SLD-FE-310
Title: Preserve HTML Style Cascade Order During Import Parsing
Status: In Progress
Verified: false
Backdated: 2026-04-26
Epic: S1 Import UX Hardening
Ticket: SLD-FE-310
Priority: P0
---

As a slide editor user
I want linked and inline stylesheet order preserved during HTML import
So that cascade and specificity continue to match source design fidelity.

Acceptance Criteria:
- [x] The parser collects style sources from `<style>` and `<link rel="stylesheet">` in document order.
- [x] Linked stylesheet CSS is inlined in the same ordering position relative to inline style blocks.
- [x] The import snapshot is built from ordered style chunks, not from an unordered aggregation.
- [x] Existing imported layout, color, and typography fidelity regressions are not introduced across representative fixtures.
- [x] Any unresolved external stylesheet is surfaced as a structured warning rather than silent fallback.

Implementation Evidence:
- [x] `src/components/slides/html-import.ts` (`inlineExternalStylesheets`, `buildRenderSnapshot`)

Tests:
- [x] `tests/e2e/slides-regression.spec.ts` includes `SLD-FE-310` coverage for external then inline override order.

Progress Notes:
- This ticket captures the style-ordering fix added after reports of imported HTML appearing mini/unfidelity due global style precedence drift.
