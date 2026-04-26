---
ID: US-CMP-BE-1501
Title: Server-side permission matrix for campaign actions
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-1501
Epic: CMP-PAR-E4: Permission and Authorization Matrix
---

As a security owner
I want campaign actions guarded by a granular server-side permission matrix
So unauthorized actions cannot succeed even if frontend gating is bypassed

Acceptance Criteria:
- [ ] Backend defines action permissions for view, create, edit, review, approve, schedule, report, and archive actions.
- [ ] API and RPC paths enforce action-level permission checks and return consistent forbidden error semantics.
- [ ] Permission checks support role plus ownership-sensitive conditions where required.
- [ ] Permission model is documented and mapped to module/user roles.
- [ ] Audit events capture denied privileged attempts with actor and target context.
- [ ] Contract tests cover allow/deny permutations for each major action class.
