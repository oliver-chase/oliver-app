---
ID: US-CMP-BE-1301
Title: Normalize campaign content status model and migration
Status: In Progress
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

Execution Update (2026-04-26):
- Added migration `016_campaign_workflow_status_normalization_and_review_durability.sql` introducing canonical `lifecycle_status` model, legacy-to-canonical mapping helpers, synchronization trigger, compatibility-safe backfill, and rollout/rollback notes.
- Added canonical/legacy dual exposure path through persisted fields (`status` + `lifecycle_status`) and rollout view `campaign_content_items_rollout_v`.
- Updated `/api/campaigns` summary pipeline to consume canonical lifecycle semantics when available with legacy fallback for compatibility.
