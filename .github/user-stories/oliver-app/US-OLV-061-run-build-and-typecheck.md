---
ID: US-OLV-061
Title: Run build and typecheck
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Security and deployment hardening

As a maintainer
I want CI to run typecheck, token scan, and build on main and staging
So that regressions are caught before deployment

Acceptance Criteria:
- [ ] A GitHub Actions workflow runs on pushes and pull requests for the active branches.
- [ ] The workflow installs dependencies, typechecks, scans tokens, and builds the static export.

Notes: The workflow file exists; I did not inspect any recent CI run results in this task.
---
