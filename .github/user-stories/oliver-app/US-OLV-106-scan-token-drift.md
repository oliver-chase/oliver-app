---
ID: US-OLV-106
Title: Scan token drift
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Operationalize design system, CI, and security

As a maintainer
I want CI to reject raw CSS values
So that the design system remains token-driven

Acceptance Criteria:
- [ ] scripts/check-tokens.mjs scans src CSS files.
- [ ] Raw hex colors fail outside exempt token/data URI contexts.
- [ ] Raw rgb/rgba values fail outside exemptions.
- [ ] Raw font-size px declarations fail outside exemptions.
- [ ] package.json exposes npm run check-tokens.

Notes: CI also runs the scanner.
---
