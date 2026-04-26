---
ID: US-OLV-083
Title: Manage HR tracks and tasks
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a HR admin
I want to configure onboarding/offboarding tracks and tasks
So that repeatable people workflows can be maintained

Acceptance Criteria:
- [ ] HrTracks lists tracks and track tasks.
- [ ] Users can add and edit tracks.
- [ ] Users can add and edit tasks.
- [ ] Deleting a track deletes its related tasks after confirmation.

Notes: Uses dbWriteMulti/dbWrite for Supabase writes.
---
