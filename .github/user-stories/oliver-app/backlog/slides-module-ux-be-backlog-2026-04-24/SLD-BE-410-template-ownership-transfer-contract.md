---
ID: SLD-BE-410
Title: Template Ownership Transfer Contract
Status: Partial (Ownership Transfer Live)
Verified: true
Backdated: 2026-04-25
---

As a platform maintainer
I want a backend ownership-transfer action with strict authorization checks
So template governance workflows remain enforceable and auditable when ownership changes

Acceptance Criteria:
- [x] `POST /api/slides` supports `transfer-template-owner` with template id plus target user id/email.
- [x] API enforces owner/admin transfer rights before updating `owner_user_id`.
- [x] Destination account must exist and have slides access before transfer succeeds.
- [x] Transfer events are written to `slide_audit_events` with previous/next ownership details.
- [ ] Extend this story with role-scoped collaborator assignment and approval rules.
