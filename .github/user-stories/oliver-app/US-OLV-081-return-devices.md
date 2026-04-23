---
ID: US-OLV-081
Title: Return devices
Status: Code Present
Verified: false
Backdated: 2026-04-19
Milestone: Build HR workflows and harden QA

As a IT or HR operator
I want to mark devices returned from employees
So that inventory availability is accurate

Acceptance Criteria:
- [ ] The return-device flow chooses an assigned device.
- [ ] Confirm marks active assignments returned.
- [ ] Confirm updates the device status and clears assignedTo.
- [ ] Errors prevent a false success confirmation.

Notes: Implemented in device-flows.tsx.
---
