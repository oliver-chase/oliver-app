---
ID: US-OLV-060
Title: Scan token drift
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Security and deployment hardening

As a maintainer
I want a token-drift scanner for raw CSS values
So that design-system regressions are caught before merge

Acceptance Criteria:
- [ ] A script scans stylesheets for raw colors and font-size px outside approved files.
- [ ] The script exits non-zero when violations are found.

Notes: The scanner is implemented and referenced by CI; I did not benchmark its false-positive rate beyond the current patterns.
---
