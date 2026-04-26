---
ID: US-IDN-005
Title: Define Admin Person 360 API Contract and Permission Guards
Status: Not Started
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

