---
ID: US-CMP-FE-1502
Title: UI gating parity with server permission matrix
Status: In Progress
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-1502
Epic: CMP-PAR-E4: Permission and Authorization Matrix
---

As a campaign user
I want the UI to only show actions I can perform
So the workspace is clear and avoids false affordances

Acceptance Criteria:
- [ ] Frontend action rendering is driven by the same permission capabilities enforced server-side.
- [ ] Disallowed actions are hidden or disabled with clear explanatory copy where needed.
- [ ] Ownership-sensitive actions (edit own content, release own claim) reflect real actor context.
- [ ] Permission changes apply without requiring full logout/login cycle.
- [ ] Permission-related failures from server are mapped to user-facing recovery messages.
- [ ] E2E tests verify capability gating for at least admin, reviewer, creator, and view-only personas.

Execution Update (2026-04-26):
- Added a shared `capabilityMatrix` in campaign workspace to gate review/admin/job/ownership actions from one capability source.
- Applied capability gating across content library, review queue, approved-unscheduled calendar lane, claimed queue, side panel, and report automation actions.
- Added explanatory panel copy for draft-edit restrictions and kept existing transition failure mapping/recovery messaging paths.
