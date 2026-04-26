---
ID: US-CMP-FE-1203
Title: Content detail side panel without navigation loss
Status: Done
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-1203
Epic: CMP-PAR-E1: Workspace IA and Context Integrity
---

As a content editor or reviewer
I want content details to open in a side panel from list and queue views
So I can review and edit items without losing my place in the workspace

Acceptance Criteria:
- [x] Clicking a content row opens a right-side panel while keeping the underlying list visible.
- [x] Panel header shows title, status, owner, and primary next action.
- [x] Panel includes compact metadata, editable draft body (when allowed), review thread, and activity history.
- [x] Panel supports close, escape key, and click-outside behaviors without route reset.
- [x] Missing metadata and overdue dates are visually flagged in the panel.
- [x] Panel section layout remains readable at desktop and tablet breakpoints.

Execution Update (2026-04-26):
- Added right-side content panel overlay opened from review/calendar action rows without navigation loss.
- Added panel metadata header (status/type/channel/owner/campaign timestamps), inline quick actions, and item activity feed.
- Added editable draft-body flow for allowed owners with save action wired to `updateCampaignContentDraftBody`.
- Added close behavior via explicit close button, `Escape`, and click-outside backdrop interaction.
- Added primary next-action labeling, review-thread context, and visual panel flags for missing metadata/overdue schedule.
