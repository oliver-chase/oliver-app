---
ID: US-IDN-005
Title: Define Admin Person 360 API Contract and Permission Guards
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As an admin or management reviewer
I want one person-360 API contract that aggregates cross-module data safely
So I can see a complete person profile without granting broad module access to everyone

Acceptance Criteria:
- [ ] API contract defines one canonical person read model with source sections (`reviews`, `hr/hiring`, `accounts`, future `crm`, device/assets).
- [ ] API response clearly marks data provenance (module + record ID + timestamp) for each section.
- [ ] Permission model ensures only authorized admin/management roles can see cross-module sensitive fields.
- [ ] Non-admin users cannot use person-360 endpoint to bypass module-level access restrictions.
- [ ] API supports partial results when some modules are unavailable and reports section-level failures.
- [ ] Contract includes pagination/limits for high-volume activity sections.
- [ ] API includes trace-safe audit fields for who requested person-360 data and when.

QA / Evidence:
- [x] `npm run lint` passed (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).
- [x] `npm run typecheck` passed (`/tmp/reviews-typecheck-2026-04-26.log`, exit_code=0).
- [x] `npm run build` passed (`/tmp/reviews-build-2026-04-26.log`, exit_code=0).
- [x] `npm run test:contracts` passed (`/tmp/reviews-contracts-2026-04-26.log`, exit_code=0).
- [ ] Person-360 endpoint contract, role matrix, and section-failure schema are pending implementation and contract tests.

Outstanding Gate Notes:
- Keep `In Progress` until API contract docs and permission guard test coverage are attached.
