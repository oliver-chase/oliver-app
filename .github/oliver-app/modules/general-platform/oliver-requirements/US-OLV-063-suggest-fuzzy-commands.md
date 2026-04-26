---
ID: US-OLV-063
Title: Suggest fuzzy commands
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Introduce shared OliverDock and upload flows

As a operator
I want typed command suggestions in OliverDock
So that I can find actions without exact labels

Acceptance Criteria:
- [ ] Input text is scored against action labels and hints.
- [ ] At most three suggestions are shown.
- [ ] Selecting a suggestion runs that action.
- [ ] If no suggestion matches, sending falls through to chat.

Notes: Uses a lightweight local fuzzy scorer.
---
