---
ID: US-O26
Title: Require Verified Actor Identity for Admin and Design System Writes
Status: Done
Verified: true
Backdated: 2026-04-25
---

As an admin user
I want admin and design-system save operations to use a verified actor identity contract
So legitimate admin actions do not fail with identity-related 401 errors

Reported incident (2026-04-25):
- Admin Dash surfaced:
  `Save failed: GET /api/users?actor_email=kiana.micari%40vtwo.co&actor_user_id=b802e11e-9f13-4a45-8c28-217d6f151715 failed: 401 {"error":"Unauthorized request. Missing verified actor identity."}`

Acceptance Criteria:
- [x] Privileged APIs reject unauthenticated requests, but accept authenticated admin requests without requiring brittle query-string-only actor fields.
- [x] Actor identity extraction uses canonical trusted headers/claims and is validated server-side.
- [x] UI uses one canonical actor payload helper for privileged fetches and avoids endpoint-specific ad hoc identity wiring.
- [x] Admin Dash user bootstrap/read path (`GET /api/users`) succeeds for authenticated owner/admin flows and does not block save journeys with identity-contract mismatch.
- [x] Error states distinguish `401 unauthenticated` vs `403 unauthorized` vs transient service failures with actionable recovery text.
- [x] Audit events for privileged writes include normalized actor identity fields.
- [x] Contract tests cover valid admin save, missing identity, spoof attempts, and identity-claim mismatch paths.

Implementation evidence (2026-04-26):
- Added shared Microsoft identity helper with robust fallback extraction in `src/lib/microsoft-identity.ts`.
- Rewired admin and user actor payload construction to use shared identity helper:
  - `src/context/UserContext.tsx`
  - `src/app/admin/page.tsx`
  - `src/components/admin/UserManager.tsx`
- Relaxed strict tenant requirement for microsoft-asserted actor path while still requiring subject claims in `functions/api/users.js`.
- Added typed users API errors + explicit 401/403/transient UI messaging in `src/lib/users.ts` and `src/components/admin/UserManager.tsx`.
- Added privileged write audit logging with normalized actor identity fields in `functions/api/users.js`.
- Added `/api/users` contract tests for admin-save/missing-identity/spoof/mismatch paths in `tests/contracts/users-api.contract.test.mjs` and `npm run test:contracts`.
