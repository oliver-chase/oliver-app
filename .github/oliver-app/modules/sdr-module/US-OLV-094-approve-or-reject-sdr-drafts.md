---
ID: US-OLV-094
Title: Approve or reject SDR drafts
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a SDR operator
I want to approve or reject generated outreach drafts
So that only reviewed messages are sent forward

Acceptance Criteria:
- [ ] SdrDrafts groups approval items into batches.
- [ ] Approve posts the selected item id and action approve to `/api/sdr-approve`.
- [ ] Reject posts the selected item id and action reject to `/api/sdr-approve`.
- [ ] Failed requests alert or display the returned error and preserve the item state.

Notes: The backend function now exists; live behavior still depends on deployed Supabase credentials and the current `sdr_approval_items` schema.
---
