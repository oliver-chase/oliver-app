---
ID: US-OLV-048
Title: Run step-flow workflows
Status: Code Present
Verified: false
Backdated: 2026-04-19
Milestone: Hub and module architecture

As a HR operator
I want modal step-by-step workflows for complex changes
So that multi-step HR operations stay guided and validated

Acceptance Criteria:
- [ ] A reusable step-flow runner can walk through modal steps with validation.
- [ ] HR-specific flows can finalize through the shared runner against live context.

Notes: The runner is implemented; I did not audit every flow definition that depends on it.
---
