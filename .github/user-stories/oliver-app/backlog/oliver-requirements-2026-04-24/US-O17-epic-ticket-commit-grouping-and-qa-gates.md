---
ID: US-O17
Title: Epic/Ticket Commit Grouping with Mandatory QA Gates
Status: Missing
Verified: false
Backdated: 2026-04-24
---

As an engineering lead  
I want commits grouped by epic/ticket slices with explicit QA evidence  
So change history stays auditable and release risk is easier to reason about.

Acceptance Criteria:
- [ ] Commits are grouped by epic and list included story IDs in the commit message/body.
- [ ] Each grouped commit includes a concise scope summary and touched modules.
- [ ] Each grouped commit records QA gate results (`typecheck`, token lint, build, smoke).
- [ ] Release notes/traceability docs map grouped commits back to story IDs.
