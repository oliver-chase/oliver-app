---
ID: US-OLV-122
Title: Maintain browser regression smoke suite
Status: Code Present
Verified: true
Backdated: 2026-04-23
Milestone: Build HR workflows and harden QA

As a maintainer
I want a browser-driven smoke suite for the major product surfaces
So that route shells, navigation, and core interactive controls can be validated repeatably across the app

Acceptance Criteria:
- [x] A committed browser test harness exists in-repo and can run against a local app instance.
- [x] The smoke suite covers `/`, `/accounts`, `/hr`, `/sdr`, `/crm`, `/admin`, and `/design-system`.
- [x] The suite verifies top-level navigation between hub cards, admin links, and major module routes.
- [x] The suite verifies representative interaction paths for Accounts, HR, SDR, Admin, and Design System without relying only on static source review.
- [x] The suite can fail when a primary route shell does not render, a top-level control cannot be activated, or a page redirects unexpectedly.

Notes: Verified locally on 2026-04-23 with `npm run test:smoke` (`playwright test`) against `http://127.0.0.1:3001`. Coverage is intentionally smoke-level, not full CRUD/destructive flow coverage.
---
