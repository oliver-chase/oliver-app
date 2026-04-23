---
ID: US-OLV-107
Title: Run build and typecheck
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Operationalize design system, CI, and security

As a maintainer
I want automated CI for typecheck, token scan, and build
So that regressions are caught before deploy

Acceptance Criteria:
- [ ] .github/workflows/ci.yml runs on push and pull_request for staging/main.
- [ ] CI runs npm ci.
- [ ] CI runs npm run typecheck.
- [ ] CI runs npm run check-tokens.
- [ ] CI runs npm run build with dummy public Supabase env vars.

Notes: No unit test script is present.
---
