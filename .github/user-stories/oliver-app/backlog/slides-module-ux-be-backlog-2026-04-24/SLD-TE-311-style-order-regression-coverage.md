---
ID: SLD-TE-311
Title: Add Regression Coverage for External + Inline Style Cascade Order
Status: In Progress
Verified: false
Backdated: 2026-04-26
Epic: S1 Import UX Hardening
Ticket: SLD-TE-311
Priority: P0
---

As a QA engineer
I want an explicit regression test for style order precedence across linked and inline CSS during import
So fidelity regressions are caught before merge.

Acceptance Criteria:
- [x] Test fixture imports HTML with a linked stylesheet setting initial styles then inline `<style>` overriding them.
- [x] Test asserts overridden color/font size are preserved exactly as last-in-order inline rules would produce.
- [x] Test exercises parser snapshot behavior without requiring companion file upload.
- [x] Test failure indicates changed cascade resolution behavior and blocks CI.
- [x] Test identifier is traceable to this ticket (`SLD-TE-311`).

Test Evidence:
- [x] `tests/e2e/slides-regression.spec.ts` includes `SLD-TE-311` visual parity check scenario.

Progress Notes:
- Uses request interception for linked stylesheet payload to keep test deterministic.
