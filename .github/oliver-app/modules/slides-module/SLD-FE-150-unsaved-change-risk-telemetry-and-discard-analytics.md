---
ID: SLD-FE-150
Title: Unsaved-Change Risk Telemetry and Discard Analytics
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a product and reliability owner
I want the slides editor to emit unsaved-change and discard-risk telemetry
So we can quantify where users abandon work and prioritize reliability fixes with evidence

Acceptance Criteria:
- [ ] Client emits structured events for unsaved-change prompts, confirm-leave, cancel-leave, autosave retry, and discard actions.
- [ ] Event payloads include actor id, workspace tab, slide id (if available), save status, and trigger source (nav, browser back, reload, close).
- [ ] Event emission is debounced/throttled to prevent noisy telemetry on repeated interactions.
- [ ] Telemetry can be disabled in local/dev mode via explicit feature flag.
- [ ] QA docs include expected telemetry event matrix by user journey.
