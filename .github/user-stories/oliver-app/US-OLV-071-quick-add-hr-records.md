---
ID: US-OLV-071
Title: Quick add HR records
Status: Code Present
Verified: false
Backdated: 2026-04-19
Milestone: Build HR workflows and harden QA

As a HR operator
I want to quickly add candidates, employees, and devices
So that new records can be captured before full details are known

Acceptance Criteria:
- [ ] Quick add candidate prompts for full name and inserts a sourced Active candidate.
- [ ] Quick add employee prompts for full name and inserts an active employee.
- [ ] Quick add device prompts for device name and inserts an available device.
- [ ] Failed inserts revert optimistic local state and set syncState error.

Notes: Uses dbWrite to surface Supabase errors.
---
