---
ID: SLD-BE-410
Title: Template Ownership + Collaborator Governance Contract
Status: Complete
Verified: true
Backdated: 2026-04-25
---

As a platform maintainer
I want backend ownership and collaborator governance actions with strict authorization checks
So template delegation workflows remain enforceable and auditable when governance changes

Acceptance Criteria:
- [x] `POST /api/slides` supports `transfer-template-owner` with template id plus target user id/email.
- [x] API enforces owner/admin transfer rights before updating `owner_user_id`.
- [x] Destination account must exist and have slides access before transfer succeeds.
- [x] Transfer events are written to `slide_audit_events` with previous/next ownership details.
- [x] API supports collaborator upsert/remove actions with owner/admin authorization and target-user slides-access checks.
- [x] Non-admin template visibility includes delegated collaborator access for private templates.
- [x] Approval workflow persists pending governance actions and supports admin approve/reject resolution with audit events.
