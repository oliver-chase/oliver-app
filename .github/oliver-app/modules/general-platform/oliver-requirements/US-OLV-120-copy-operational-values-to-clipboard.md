---
ID: US-OLV-120
Title: Copy operational values to clipboard
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Build HR workflows and harden QA

As a operator
I want copy buttons for frequently reused operational values
So that I can paste notes, device identifiers, and prospect contact details into external tools

Acceptance Criteria:
- [ ] Design-system token copy controls call navigator.clipboard.writeText with the selected token name.
- [ ] Inventory detail copy controls copy device serial numbers and order numbers when those fields are present.
- [ ] Account note copy controls copy the selected note as markdown text.
- [ ] SDR prospect detail copies the prospect email when the email field is present.
- [ ] Clipboard failures in SDR prospect detail are caught without closing the panel or throwing an uncaught runtime error.

Notes: Clipboard behavior is present in several components but has limited user-visible failure feedback.
---
