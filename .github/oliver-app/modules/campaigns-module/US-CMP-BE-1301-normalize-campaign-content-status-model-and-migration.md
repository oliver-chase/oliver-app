---
ID: US-CMP-BE-1301
Title: Normalize campaign content status model and migration
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-1301
Epic: CMP-PAR-E2: Workflow State and Review Durability
---

As a platform owner
I want campaign content statuses to match the product workflow contract
So frontend behavior, reporting, and automation all operate on the same lifecycle model

Acceptance Criteria:
- [ ] Backend supports canonical statuses: `draft`, `in_review`, `changes_requested`, `approved`, `scheduled`, `posted`, `blocked`, `archived`.
- [ ] Migration plan preserves existing data and maps legacy states with reversible rollout steps.
- [ ] Status transition rules are enforced server-side with explicit invalid-state errors.
- [ ] Activity logs record state transitions using canonical action taxonomy.
- [ ] API responses expose both new status and migration-safe compatibility fields during rollout window.
- [ ] Migration includes backfill validation and rollback instructions.
