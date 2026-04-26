---
ID: US-IDN-002
Title: Enforce Microsoft OID and Tenant Identity Protocol
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As a security-conscious admin
I want identity joins to use Microsoft auth identifiers instead of names/emails
So identity linking remains correct when names and email aliases change

Acceptance Criteria:
- [x] Microsoft auth mapping uses provider `microsoft` with `oid` as primary subject key.
- [x] `tid` (tenant ID) is stored and considered in identity uniqueness constraints.
- [x] `sub` is only used as an explicit fallback when `oid` is unavailable and fallback behavior is documented.
- [x] Identity lookup/join logic no longer relies on display name or raw email as primary key.
- [x] Identity conflict scenarios (same email, different oid/tid) are handled with explicit reconciliation rules.
- [x] Audit/log fields capture identity source and mapping decision path for debugging.
- [ ] Protocol includes test cases for token shape variants and fallback behavior.

Implementation Notes (2026-04-25):
- Runtime wiring now threads `microsoft_oid`, `microsoft_tid`, and optional `microsoft_sub` from MSAL claims through `UserContext` -> `src/lib/users.ts` -> `/api/users`.
- `/api/users` syncs canonical identity rows during bootstrap/upsert and returns explicit `409` conflicts for ambiguous identity joins.
- Fallback protocol: prefer `oid`; if missing, use `sub` with same `tid` scope; if both are present, both are mapped to the same `person_id` or the request is rejected on conflict.
