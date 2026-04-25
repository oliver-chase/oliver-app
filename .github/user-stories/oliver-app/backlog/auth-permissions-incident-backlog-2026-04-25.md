# Auth + Module Access Incident Backlog (2026-04-25)

## Scope
Incident observed: after sign-in, hub briefly shows 4 modules, then collapses to:
"No modules assigned. Contact your administrator."

Business requirement: **Kiana Micari must always retain Owner/Super-Admin permissions** (admin + full module access) across all environments.

---

## Epic EP-AUTH-001: Stabilize Hub Permission Resolution and Remove Access Flicker

### Story US-AUTH-001
As a signed-in user, I want hub module visibility to load deterministically, so I never see modules flash and disappear.

Acceptance criteria:
- Hub does not render module cards until permission state is resolved (`isLoading=false`) or a clearly defined fallback policy is active.
- A user with no permissions never sees temporarily visible restricted modules.
- A user with permissions sees a stable list with no transient "all modules" state.
- Existing "No modules assigned" empty state still renders when user has zero allowed modules after resolution.

Tickets:
- AUTH-101 (FE, P0): Refactor hub filtering to gate on explicit permission state machine (`loading`, `resolved`, `error`) instead of `appUser !== null` heuristic.
- AUTH-102 (FE, P0): Add skeleton/loading placeholder for module grid while permissions resolve.
- AUTH-103 (QA, P0): Add Playwright test proving "no flash of unauthorized modules" on first paint and after hard refresh.

### Story US-AUTH-002
As a module user, I want deep-linked route access to be blocked until permissions are resolved, so unauthorized users cannot briefly render protected modules.

Acceptance criteria:
- Protected module routes (`/accounts`, `/hr`, `/sdr`, `/slides`, `/crm`) remain blocked while permission resolution is loading.
- If permission check fails or denies, user is redirected to hub without module content rendering.
- Behavior is consistent for hard refresh and direct URL navigation.

Tickets:
- AUTH-104 (FE, P0): Update `useModuleAccess` to require resolved permissions before `allowRender=true`.
- AUTH-105 (QA, P0): Add route-level unauthorized render prevention tests for all protected modules.

---

## Epic EP-AUTH-002: Enforce Owner/Super-Admin Invariants for Kiana Micari

### Story US-AUTH-003
As platform governance, I need an immutable owner policy so Kiana Micari cannot lose admin/full access due to bad data, migration drift, or UI edits.

Acceptance criteria:
- Owner identity list is configured server-side (env var or config table) and includes Kiana Micari.
- On every user read/upsert/update, owner invariant is enforced: `role=admin` and full permission set.
- Admin UI cannot demote, delete, or strip owner permissions.
- Attempted owner demotion is rejected with explicit error and audited.

Tickets:
- AUTH-201 (BE, P0): Add owner policy (`OWNER_EMAILS` and optional `OWNER_USER_IDS`) to `/api/users`.
- AUTH-202 (BE, P0): Enforce immutable owner guard in PATCH path (role/permissions mutation blocklist).
- AUTH-203 (FE, P1): Lock owner rows in User Manager (disabled controls + explanatory tooltip/text).
- AUTH-204 (QA, P0): Add API tests for owner demotion prevention and invariant auto-repair.

### Story US-AUTH-004
As operations, I need deterministic owner bootstrap so Kiana has admin on first deploy and cannot be locked out.

Acceptance criteria:
- A repeatable bootstrap/seed script exists and is used in staging + production rollout.
- Script guarantees owner row creation/update regardless of existing placeholder `user_id`.
- Runbook documents exact command, verification query, and rollback.
- CI/CD deploy checklist includes owner verification gate.

Tickets:
- AUTH-205 (Ops/DB, P0): Add `scripts/setup-app-users.sql` (or equivalent migration-safe script) that seeds owner/admin rows.
- AUTH-206 (Ops, P0): Add deployment runbook with post-deploy verification for owner access.
- AUTH-207 (QA, P1): Add smoke check that owner account sees admin links + full module set after sign-in.

---

## Epic EP-AUTH-003: Secure User/Permission APIs (Critical Security Hardening)

### Story US-AUTH-005
As a security stakeholder, I need `/api/users` to enforce authenticated admin authorization server-side so non-admin users cannot read/modify roles.

Acceptance criteria:
- `/api/users` requires verified caller identity (`cf-access-authenticated-user-email` in prod).
- Caller is mapped to `app_users` and must be admin for list/mutation operations.
- Non-admin gets `403`; unauthenticated gets `401`.
- Security checks are enforced independent of frontend UI visibility.

Tickets:
- AUTH-301 (BE, P0): Implement actor identity extraction + admin authorization for GET/POST/PATCH in `/api/users`.
- AUTH-302 (BE, P0): Restrict `GET /api/users` list-all to admin only; narrow `GET ?user_id=` to self/admin policy.
- AUTH-303 (QA/Sec, P0): Add negative tests (non-admin privilege escalation attempts).

### Story US-AUTH-006
As security, I need admin key management endpoints to enforce authorization and least privilege.

Acceptance criteria:
- `/api/admin/keys` enforces admin-only access and does not rely on anonymous key semantics.
- Secret-bearing operations are protected by role checks and audited.
- Non-admin requests are denied and logged.

Tickets:
- AUTH-304 (BE, P0): Add authenticated actor + admin authorization middleware to `/api/admin/keys`.
- AUTH-305 (BE, P0): Validate Supabase access model for `ai_config` and remove reliance on anon-key trust assumptions.
- AUTH-306 (Sec, P1): Perform endpoint threat model review for all `/api/*` write routes.

---

## Epic EP-AUTH-004: Identity Canonicalization and Data Integrity

### Story US-AUTH-007
As an identity admin, I need robust identity matching so owner/admin mappings survive case changes, aliasing, and tenant claim variation.

Acceptance criteria:
- Email normalization is applied consistently (trim/lowercase) before lookup/write.
- Fallback matching strategy is deterministic (`user_id` first, normalized email second) with conflict handling.
- Duplicate logical identities are detected and repaired.
- Audit log records identity-link changes (old/new `user_id` and email).

Tickets:
- AUTH-401 (BE, P1): Normalize email inputs in `/api/users` GET/POST and persist canonical lowercase.
- AUTH-402 (DB, P1): Add migration to enforce case-insensitive uniqueness (`citext` or functional unique index on `lower(email)`).
- AUTH-403 (Ops, P1): Create one-time dedupe script for historical `app_users` identity collisions.
- AUTH-404 (QA, P1): Add tests for email case mismatch and placeholder-to-real `user_id` reconciliation.

### Story US-AUTH-008
As platform ops, I need explicit handling for missing Azure OID/sub claims to avoid unsafe fallback behavior.

Acceptance criteria:
- Missing stable identity claim does not silently degrade into unrestricted module visibility.
- User sees actionable error state and support path.
- Incident telemetry records claim-missing failures with correlation id.

Tickets:
- AUTH-405 (FE/BE, P1): Replace permissive fallback on identity failures with explicit blocked state.
- AUTH-406 (Obs, P2): Add structured logging + alert on "Missing Azure user identifier".

---

## Epic EP-AUTH-005: Product/UX and Admin Operability

### Story US-AUTH-009
As an admin, I need to see why a user has no modules so support can resolve access issues quickly.

Acceptance criteria:
- Hub empty state includes optional support diagnostic id (non-sensitive).
- Admin user detail shows effective role, explicit permissions, and source of access (owner override vs direct assignment).
- Permission update actions emit audit events.

Tickets:
- AUTH-501 (FE, P2): Improve empty-state UX with support guidance and retry diagnostics.
- AUTH-502 (FE, P2): Add "effective access" column in User Manager.
- AUTH-503 (BE, P1): Add permission-change audit trail (`actor`, `target`, before/after, timestamp).

### Story US-AUTH-010
As an admin, I need safe controls to avoid accidental lockout of all admins.

Acceptance criteria:
- System prevents removal of the last non-owner admin without explicit break-glass workflow.
- Break-glass recovery process is documented and tested.
- Admin mutations require optimistic concurrency protection to avoid race-condition overwrites.

Tickets:
- AUTH-504 (BE, P1): Add "at least one admin" invariant validation on role mutations.
- AUTH-505 (Ops, P1): Add break-glass recovery runbook and quarterly validation task.
- AUTH-506 (BE, P2): Add optimistic concurrency fields (`updated_at` check) for admin permission updates.

---

## Epic EP-AUTH-006: Test and Release Gates for Auth/Permissions

### Story US-AUTH-011
As engineering, I need realistic permission-path test coverage so regressions are caught before deploy.

Acceptance criteria:
- E2E covers real permission resolution flow (not only localStorage bypass).
- Test fixtures use valid role enum values (`admin|user`) and reflect production schema.
- Coverage includes owner invariant, no-permission user, and permissions-service outage behavior.

Tickets:
- AUTH-601 (QA, P0): Add staging smoke suite for real MSAL + `/api/users` path (nightly or pre-release).
- AUTH-602 (QA, P1): Fix invalid role fixture usage (`member`) and align with schema.
- AUTH-603 (QA, P1): Add regression tests for "modules flash then disappear" and "owner always admin".

### Story US-AUTH-012
As release management, I need deployment gates that fail fast if owner/admin access is broken.

Acceptance criteria:
- Pre-release checklist verifies owner login, module visibility, admin route, and mutation permissions.
- Release cannot be marked complete without successful auth/permissions gate.
- Evidence links are captured in release traceability docs.

Tickets:
- AUTH-604 (Ops/QA, P1): Add auth-permissions gate to release checklist/runbook.
- AUTH-605 (Docs, P2): Update `README` and `STATE` docs to remove contradictory fallback assumptions once hardened.

---

## Immediate Triage Checklist (execute first)

1. Confirm Kiana Micari identity row(s) in `app_users` (by normalized email + current Azure `oid`).
2. Force owner row to `role=admin` and full module permissions.
3. Verify `/` hub shows stable module set with no flash/disappear.
4. Verify `/admin` and `/design-system` access for owner account.
5. Create incident note with root cause category:
   - Missing seed
   - Identity mismatch
   - Role/permission drift
   - API security/configuration defect

---

## Evidence Anchors (current implementation)

- Hub currently shows all modules before `appUser` resolves: `src/app/page.tsx` lines 21-27.
- Hub can show empty state after user resolves with no permissions: `src/app/page.tsx` lines 80-82.
- User auto-upsert path creates default user row if missing: `src/context/UserContext.tsx` lines 112-119.
- No owner invariant exists in `UserProvider` or `/api/users`.
- `/api/users` currently has no actor authorization checks: `functions/api/users.js` lines 43-161.
- `app_users` schema defaults to non-admin/no-permissions and manual seed comment: `supabase/migrations/001_app_users.sql` lines 6-8, 26-28.
- Existing smoke test fixture includes invalid role value (`member`), indicating schema-test drift: `tests/e2e/frontend-smoke.spec.ts` line 546.
