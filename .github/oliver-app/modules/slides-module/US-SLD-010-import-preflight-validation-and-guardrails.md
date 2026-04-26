---
ID: US-SLD-010
Title: Import Preflight Validation and Guardrails
Status: Done
Verified: true
Backdated: 2026-04-24
---

As a slide editor user
I want clear preflight checks before parsing imported HTML
So I can fix invalid input quickly and avoid confusing parser failures

Acceptance Criteria:
- [x] File import validates type and size before parse starts and shows actionable validation errors.
- [x] Pasted HTML path validates empty/whitespace-only input and reports clear guidance.
- [x] Parse failures are categorized (invalid markup, unsupported layout, generic failure) with user-readable messages.
- [x] Error states are persistent and recoverable without reloading the page.
