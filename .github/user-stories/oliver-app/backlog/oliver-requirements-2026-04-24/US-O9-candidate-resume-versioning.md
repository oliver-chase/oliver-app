---
ID: US-O9
Title: Candidate Resume Versioning and File/Link Management
Status: Code Present
Verified: false
Backdated: 2026-04-24
---

As a recruiter  
I want to keep multiple resume versions per candidate  
So I can keep old/new history, download current docs, and remove obsolete versions safely.

Acceptance Criteria:
- [x] Candidate edit flow supports adding multiple resume versions.
- [x] Resume versions can be added from URL links or uploaded files.
- [x] Resume versions are ordered newest-first by stored timestamp.
- [x] Each version can be opened/downloaded in its original format.
- [x] Deleting a version requires explicit confirmation before final removal.
- [x] Resume versions are visible both in candidate edit modal and hiring detail panel.
- [x] Existing legacy single-link resume values continue to render as a valid resume entry.
- [x] Candidate data export includes resume version metadata because versions persist on the candidate record.
