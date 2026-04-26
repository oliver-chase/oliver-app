---
ID: US-OLV-076
Title: Manage employee directory
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a HR operator
I want to view, filter, add, edit, and delete employees
So that employee records stay current

Acceptance Criteria:
- [ ] HrDirectory renders employee rows/cards from db.employees.
- [ ] Users can add and edit employees.
- [ ] Delete uses a confirmation and Supabase write path.
- [ ] Pending edit ids from flows open the target employee for editing.

Notes: Offboarding is handled as a separate workflow.
---
