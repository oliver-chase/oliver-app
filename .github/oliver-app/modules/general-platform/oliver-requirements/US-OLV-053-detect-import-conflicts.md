---
ID: US-OLV-053
Title: Detect import conflicts
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a account manager
I want a dry-run conflict check before imported data is written
So that duplicate meetings and people changes are caught early

Acceptance Criteria:
- [ ] OliverDock calls upload.dryRun before commit.
- [ ] /api/confirm-write with dryRun:true fetches existing account data.
- [ ] Duplicate note titles/dates and people role/department differences are reported as conflicts.
- [ ] The user must explicitly choose Write Anyway when conflicts exist.

Notes: Conflict detection is intentionally narrow.
---
