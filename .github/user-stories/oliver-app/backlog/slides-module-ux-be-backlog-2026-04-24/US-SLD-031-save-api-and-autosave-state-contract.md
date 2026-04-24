---
ID: US-SLD-031
Title: Save API and Autosave State Contract
Status: Missing
Verified: false
Backdated: 2026-04-24
---

As a slide editor user
I want manual save and autosave backed by a clear API contract
So editing sessions persist reliably and communicate state clearly

Acceptance Criteria:
- [ ] Slides API supports create/update for component JSON and metadata payloads.
- [ ] Frontend shows consistent dirty/saving/saved/error states tied to real API outcomes.
- [ ] Autosave runs on a configurable interval and skips when no changes are pending.
- [ ] API and UI contract covers save failure handling and retry behavior.

