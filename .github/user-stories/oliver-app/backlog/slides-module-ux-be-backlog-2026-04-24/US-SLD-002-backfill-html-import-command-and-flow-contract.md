---
ID: US-SLD-002
Title: Backfill HTML Import Command and Flow Contract
Status: Code Present
Verified: false
Backdated: 2026-04-24
---

As a slide editor user
I want current import entry points and Oliver command flows documented as a tracked story
So expected behavior for file import and pasted HTML parsing is maintained across releases

Acceptance Criteria:
- [x] Story coverage includes "Import HTML File" and "Parse Pasted HTML" commands.
- [x] Story coverage includes flow-step behavior for "use current HTML" vs "paste new HTML".
- [x] Story evidence references `src/app/slides/commands.ts`, `src/app/slides/flows.ts`, and `/slides` UI actions.
- [x] Smoke coverage asserts parse action output for at least one valid sample import.
