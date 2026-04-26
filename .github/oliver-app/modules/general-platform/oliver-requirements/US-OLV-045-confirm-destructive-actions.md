---
ID: US-OLV-045
Title: Confirm destructive actions
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a operator
I want branded confirmation dialogs for risky actions
So that I can avoid accidental destructive changes

Acceptance Criteria:
- [ ] AppModal/ConfirmModal render explicit confirm and cancel controls.
- [ ] Danger confirmations use danger styling.
- [ ] Escape or cancel dismisses the modal without applying the action.
- [ ] Required confirmation inputs disable confirm until valid when configured.

Notes: Replaced native prompt/confirm flows.
---
