---
ID: US-OLV-080
Title: Assign devices
Status: Code Present
Verified: false
Backdated: 2026-04-19
Milestone: Build HR workflows and harden QA

As a IT or HR operator
I want to assign devices to employees
So that asset custody is recorded

Acceptance Criteria:
- [ ] The assign-device flow lets the user choose a device and employee.
- [ ] Confirm inserts an assignment record.
- [ ] Confirm updates the device status to assigned and assignedTo to the employee.
- [ ] Failures from either Supabase write are reported as flow errors.

Notes: Implemented in device-flows.tsx.
---
