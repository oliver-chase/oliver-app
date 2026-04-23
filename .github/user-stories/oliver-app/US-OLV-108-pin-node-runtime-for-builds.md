---
ID: US-OLV-108
Title: Pin Node runtime for builds
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a maintainer
I want a consistent Node version for local and CI builds
So that build behavior is stable across machines

Acceptance Criteria:
- [ ] The repo includes .nvmrc.
- [ ] The CI workflow configures Node 20 before installing dependencies or running the build.
- [ ] README or state docs identify the expected runtime.
- [ ] Build scripts do not require a local runtime server.

Notes: Backdated from build blocker fixes.
---
