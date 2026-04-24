---
ID: US-SLD-004
Title: Align Slide Module Copy With Current Capabilities
Status: Code Present
Verified: false
Backdated: 2026-04-24
---

As a slide editor user
I want labels, prompts, and helper text to match what the module can actually do today
So the UI does not promise non-existent template or export workflows

Acceptance Criteria:
- [x] Slide module registry description and default greeting are updated to reflect current import-first capability.
- [x] Slides quick conversation prompts avoid implying implemented template/export flows that are not available.
- [x] Any future functionality references are clearly labeled as backlog/coming-soon.
- [x] Smoke or snapshot checks cover at least one canonical headline/subtitle string on `/slides`.
