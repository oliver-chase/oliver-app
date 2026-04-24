---
ID: US-SLD-013
Title: Import/Export Round-Trip Fixture Reliability
Status: Missing
Verified: false
Backdated: 2026-04-24
---

As a QA lead
I want fixture-based round-trip reliability checks for slide HTML conversion
So parser changes do not silently break re-import quality

Acceptance Criteria:
- [ ] Canonical slide HTML fixtures are committed for representative layout patterns.
- [ ] Tests validate import output invariants (component count, key coordinates, type inference) against fixtures.
- [ ] Round-trip checks enforce drift tolerance thresholds for x/y/width after export then re-import.
- [ ] Round-trip tests run in CI and fail on contract-breaking parser regressions.

