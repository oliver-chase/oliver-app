---
ID: US-IDN-001
Title: Create Canonical People and Identity Mapping Layer
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As a platform architect
I want one canonical person layer with identity mappings
So all modules can reference the same person consistently instead of duplicating names/emails

Acceptance Criteria:
- [x] `people` table is introduced as the canonical person record (`person_id` primary key).
- [x] `person_identities` table maps auth identities to `person_id` with provider metadata.
- [x] Identity model supports Microsoft sign-in fields needed for uniqueness and traceability.
- [x] Constraints prevent duplicate identity rows for the same provider subject and tenant.
- [x] Canonical person model separates mutable profile fields (name/email) from immutable identity keys.
- [x] Data model decisions are documented, including which columns are user-editable vs system-managed.
- [x] Migration and rollback strategy is included in backlog notes.

Implementation Notes (2026-04-25):
- Migration: `supabase/migrations/012_identity_people_and_microsoft_mapping.sql`
- User-editable profile fields live on `people` (`full_name`, `primary_email`, `profile`).
- System-managed identity keys and mapping trace fields live on `person_identities` (`provider`, `tenant_id`, `subject_key`, `subject_key_type`, `identity_source`, `mapping_decision`).
- Rollback protocol: deploy code that no longer reads/writes these tables, then drop `person_identities` and `people` in reverse dependency order.
