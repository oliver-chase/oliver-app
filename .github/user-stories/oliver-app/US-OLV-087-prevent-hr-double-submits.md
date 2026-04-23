---
ID: US-OLV-087
Title: Prevent HR double submits
Status: Code Present
Verified: false
Backdated: 2026-04-19
Milestone: Build HR workflows and harden QA

As a HR operator
I want busy-state guards during HR flow writes
So that duplicate records are not created by repeated clicks

Acceptance Criteria:
- [ ] StepFlowRunner tracks busy state while running a step.
- [ ] Escape is disabled while busy.
- [ ] Flow submit does not run again during an active write.
- [ ] Errors clear the busy state for retry.

Notes: Backdated from HR review fixes.
---
