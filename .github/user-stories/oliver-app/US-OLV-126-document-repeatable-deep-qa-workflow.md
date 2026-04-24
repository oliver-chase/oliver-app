---
ID: US-OLV-126
Title: Document repeatable deep QA workflow
Status: Code Present
Verified: true
Backdated: 2026-04-23
Milestone: Operationalize design system, CI, and security

As a maintainer
I want a documented deep QA workflow for full-repo passes
So that broad requests for strong, focused, or codebase-wide QA produce repeatable coverage instead of relying on session memory

Acceptance Criteria:
- [x] The repo documents the expected steps for a deep QA pass, including static gates, browser checks, story/audit review, and high-risk manual validation areas.
- [x] The documented workflow distinguishes between local smoke coverage and live-environment validation that depends on deployed APIs, auth, and seeded data.
- [x] The workflow identifies the minimum required checks for navigation integrity, shell consistency, dropdowns, modals, edit fields, pills, placeholders, copy controls, and error/fallback states.
- [x] The workflow is committed in git so future QA requests can reuse it without relying on prior chat context.
- [x] The workflow names any generated artifacts that should not be committed, such as transient browser test output.

Notes: Implemented via `src/tech-debt/deep-qa-workflow.md` and linked from `README.md`.
---
