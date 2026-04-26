---
ID: US-IDN-003
Title: Bridge app_users to person_id and Backfill Existing Users
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As an admin operator
I want current `app_users` records bridged to canonical people
So existing permissions and module access continue working during identity migration

Acceptance Criteria:
- [x] `app_users` includes `person_id` foreign key to canonical `people`.
- [x] Backfill process maps all existing `app_users` rows to `people` and `person_identities`.
- [x] Owner/admin invariants remain intact after backfill.
- [x] Migration is idempotent and safe to rerun in non-prod and prod environments.
- [ ] Any unmapped or conflicting records are captured in a reconciliation report.
- [x] Runtime auth bootstrap paths continue to function during and after migration.
- [ ] Rollout includes staged validation checklist and post-migration verification queries.

Implementation Notes (2026-04-25):
- Migration: `supabase/migrations/013_app_users_person_bridge.sql`
- Runtime upsert path in `/api/users` now writes `app_users.person_id` from canonical identity resolution, with compatibility fallback before the bridge column is present.
- Legacy backfill uses `tenant_id='legacy-unknown-tenant'` with explicit mapping metadata so records can be reconciled to real tenant-scoped identity on next sign-in.
