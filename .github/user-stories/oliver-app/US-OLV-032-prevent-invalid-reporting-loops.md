---
ID: US-OLV-032
Title: Prevent invalid reporting loops
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a account manager
I want reporting manager choices to exclude descendants
So that the org chart cannot create circular relationships

Acceptance Criteria:
- [ ] PeopleSection identifies descendant relationships.
- [ ] Manager pickers do not allow selecting a descendant as manager.
- [ ] Existing invalid or missing manager values do not crash rendering.

Notes: Backdated from people/orgchart QA fixes.
---
