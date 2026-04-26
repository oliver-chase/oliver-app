---
ID: US-RVW-003
Title: Codify Every Click, Popup, and Navigation Destination
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a product and QA lead
I want a full interaction map for the reviews module
So every click, popup, button, and redirect is predictable and testable

Acceptance Criteria:
- [ ] A click-path matrix exists for all interactive controls in reviews, including trigger, precondition, target behavior, and resulting state change.
- [ ] Matrix includes navigation links, section tabs, save buttons, progress controls, refresh controls, and chatbot quick actions.
- [ ] Matrix explicitly documents popup/modal usage and confirms where no popup is expected.
- [ ] For every action, matrix identifies where data comes from (local state, Supabase table, auth/user context, computed values).
- [ ] For every action, matrix identifies where data goes (table write, state update, router push, scroll target, chat flow state).
- [ ] Matrix includes expected success and failure UX copy for each write action.
- [ ] Matrix is stored in backlog/docs and referenced by smoke test planning.

