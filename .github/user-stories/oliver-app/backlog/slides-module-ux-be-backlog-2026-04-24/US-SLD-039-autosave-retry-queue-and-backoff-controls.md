---
ID: US-SLD-039
Title: Autosave Retry Queue and Backoff Controls
Status: Code Present
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want autosave failures to queue with transparent retry behavior
So transient save issues do not silently lose my in-progress work

Acceptance Criteria:
- [x] Autosave failures enqueue retry state with bounded exponential backoff.
- [x] Retry queue state is visible in the UI with explicit retry-now and dismiss controls.
- [x] Online reconnect events can accelerate queued retry attempts.
- [x] Save status and error messaging distinguish between queued retries and terminal save failures.

