---
ID: US-SLD-038
Title: Scoped Draft Recovery Lifecycle for Unsaved Edits
Status: Code Present
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want per-user draft recovery that appears only for unsaved work
So crash recovery is reliable without stale draft prompts

Acceptance Criteria:
- [x] Draft recovery keys are scoped per user to avoid cross-user collisions.
- [x] Legacy draft keys are migrated safely to the scoped format.
- [x] Successful save clears local recovery draft state so recovery banners do not persist incorrectly.
- [x] Draft recovery lifecycle behavior is covered by automated browser regression tests.

