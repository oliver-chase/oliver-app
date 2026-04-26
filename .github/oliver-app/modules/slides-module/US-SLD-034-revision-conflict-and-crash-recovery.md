---
ID: US-SLD-034
Title: Revision Conflict Handling and Crash Recovery
Status: Done
Verified: true
Backdated: 2026-04-24
---

As a slide editor user
I want conflict detection and crash recovery workflows
So work is not silently overwritten or lost during interruptions

Acceptance Criteria:
- [x] Slide save payloads include revision/version fields and backend rejects stale writes with explicit conflict responses.
- [x] Frontend conflict UI supports reload, overwrite, or save-as-copy options.
- [x] Local draft recovery snapshots are created while editing and offered on reopen after failure/crash.
- [x] Recovery and conflict paths are covered by automated tests.
