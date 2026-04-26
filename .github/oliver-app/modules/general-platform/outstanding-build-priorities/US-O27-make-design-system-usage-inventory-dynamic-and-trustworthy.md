---
ID: US-O27
Title: Make Design System Usage Inventory Dynamic and Trustworthy
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a design admin
I want token and component usage reporting to reflect real usage state with clear confidence signals
So cleanup decisions are accurate and do not remove active dependencies

Reported incident (2026-04-25):
- Design System surfaced: `41` tokens with "no tracked usage".

Acceptance Criteria:
- [x] Usage inventory separates `used`, `candidate-unused`, and `untracked` states with clear definitions shown in UI.
- [x] "No tracked usage" messaging includes last scan time, scope, and known blind spots.
- [x] Token rows can surface at least one evidence pointer when usage is found (file/path or component reference).
- [x] The "no tracked usage" aggregate count is backed by scan metadata and can be reconciled against the token list without hidden or stale entries.
- [x] A manual re-scan control exists for admins and reports scan completion/failure status.
- [x] Usage scan pipeline is non-blocking for page load and degrades gracefully when scan data is unavailable.
- [x] QA fixtures include true-unused and known-used tokens to validate false-positive/false-negative behavior.

Implementation evidence (2026-04-26):
- Updated Design System audit model and UI state separation in `src/app/design-system/page.tsx`:
  - Introduced explicit `used`, `candidate-unused`, and `untracked` buckets.
  - Added catalog metadata (last update, scope, blind spots) and summary counts.
  - Updated per-token usage labels to distinguish `untracked` vs `candidate-unused`.
- Added manual `Re-Scan Usage Catalog` control with running/success/failure status and timestamp update.
- Added QA fixture tokens:
  - known-used: `--color-brand-pink`
  - candidate-unused: `--color-status-success-bg`
- Added supporting audit styles in `src/app/design-system/ds.css`.
- Added/updated e2e coverage in `tests/e2e/frontend-smoke.spec.ts` for state separation and swatch-level labeling.
