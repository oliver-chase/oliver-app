---
ID: US-SLD-034
Title: Revision Conflict Handling and Crash Recovery
Status: Missing
Verified: false
Backdated: 2026-04-24
---

As a slide editor user
I want conflict detection and crash recovery workflows
So work is not silently overwritten or lost during interruptions

Acceptance Criteria:
- [ ] Slide save payloads include revision/version fields and backend rejects stale writes with explicit conflict responses.
- [ ] Frontend conflict UI supports reload, overwrite, or save-as-copy options.
- [ ] Local draft recovery snapshots are created while editing and offered on reopen after failure/crash.
- [ ] Recovery and conflict paths are covered by automated tests.

