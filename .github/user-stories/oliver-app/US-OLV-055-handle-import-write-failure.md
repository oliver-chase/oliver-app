---
ID: US-OLV-055
Title: Handle import write failure
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a account manager
I want clear failure feedback when an import cannot be written
So that I know the import did not save

Acceptance Criteria:
- [ ] Missing Supabase config returns a 503 error.
- [ ] Failed existing-data fetch returns an error response.
- [ ] Failed writes return Write failed with the backend message.
- [ ] OliverDock displays write failure text in the conversation.

Notes: No automatic rollback is needed because writes are attempted as a batch of independent requests.
---
