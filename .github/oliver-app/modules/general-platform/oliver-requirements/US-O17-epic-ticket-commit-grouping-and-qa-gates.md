---
ID: US-O17
Title: Epic/Ticket Commit Grouping with Mandatory QA Gates
Status: Code Present
Verified: true
Backdated: 2026-04-24
---

As an engineering lead  
I want commits grouped by epic/ticket slices with explicit QA evidence  
So change history stays auditable and release risk is easier to reason about.

Acceptance Criteria:
- [x] Commits are grouped by epic and list included story IDs in the commit message/body.
- [x] Each grouped commit includes a concise scope summary and touched modules.
- [x] Each grouped commit records QA gate results (`typecheck`, token lint, build, smoke).
- [x] Release notes/traceability docs map grouped commits back to story IDs.

Notes: Implemented with `src/tech-debt/commit-grouping-and-qa-gates.md`, `.gitmessage`, `.github/pull_request_template.md`, and `src/tech-debt/release-traceability.md`.
