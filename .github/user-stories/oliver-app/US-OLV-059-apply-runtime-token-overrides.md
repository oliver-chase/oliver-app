---
ID: US-OLV-059
Title: Apply runtime token overrides
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Security and deployment hardening

As a app user
I want saved token overrides applied at runtime
So that design-system changes take effect without rebuilding the bundle

Acceptance Criteria:
- [ ] The root layout mounts a token override loader.
- [ ] The loader fetches overrides and applies them to the document root.

Notes: Implemented through `TokenOverridesLoader`; startup timing and failure handling were not validated in-browser.
---
