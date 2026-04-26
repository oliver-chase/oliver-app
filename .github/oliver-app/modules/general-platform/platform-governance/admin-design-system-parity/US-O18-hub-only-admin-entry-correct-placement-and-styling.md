---
ID: US-O18
Title: Hub-Only Admin Entry with Correct Placement and Styling
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As an admin user  
I want the Admin entry to appear only on the hub, in the correct place, using the correct button style  
So privileged navigation is easy to find without cluttering the rest of the app.

Current state:
- The hub right rail currently shows `Design System` and `Admin` beside `Sign out` in [src/app/page.tsx](/Users/oliver/projects/oliver-app/src/app/page.tsx:47).
- A separate global `AdminEntryButton` is mounted in [src/app/layout.tsx](/Users/oliver/projects/oliver-app/src/app/layout.tsx:24), so the admin affordance persists across module routes.
- The global `AdminEntryButton` styling does not match the canonical hub right-rail admin button treatment in [src/app/hub.module.css](/Users/oliver/projects/oliver-app/src/app/hub.module.css:73).

Acceptance Criteria:
- [ ] The hub right side shows only the signed-in email and `Sign out`.
- [ ] A single `Admin` button appears on the left side of the hub at the same vertical rhythm/margin line as the session controls.
- [ ] The hub `Admin` button is visible only to effective admins and only on the home route (`/`).
- [ ] The hub `Admin` button uses the canonical current right-rail button styling, not the persistent global chip styling.
- [ ] The global persistent `AdminEntryButton` no longer renders across module routes.
- [ ] Non-admin users and blocked permission states never see the hub `Admin` button.
