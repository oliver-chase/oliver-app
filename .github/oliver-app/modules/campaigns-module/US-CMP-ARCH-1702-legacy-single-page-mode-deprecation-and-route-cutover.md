---
ID: US-CMP-ARCH-1702
Title: Legacy single-page mode deprecation and route cutover
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-ARCH-1702
Epic: CMP-PAR-E6: E2E Certification and Legacy Cutover
---

As a platform maintainer
I want to retire the legacy all-sections-on-one-page campaign mode after parity completion
So the module runs on one stable route model and avoids duplicate behavior paths

Acceptance Criteria:
- [ ] Route architecture is finalized on campaign subpages with consistent deep-link behavior.
- [ ] Legacy single-page section rendering path is feature-flagged and removed after parity sign-off.
- [ ] Redirect and backward-compat behavior are documented for old links/bookmarks.
- [ ] Chatbot quick actions and flow deep-links target canonical subpage routes.
- [ ] Smoke and E2E suites are updated to canonical route model before deprecation.
- [ ] Rollout plan includes staged enablement, rollback switch, and production verification checklist.
