---
ID: US-CMP-BE-210
Title: Content and asset schema foundation
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-210
Epic: CMP-E2: Content Drafting and Asseting
---

As a contributor
I want content and asset records with lifecycle fields so drafting and posting can be tracked.
So data remains consistent from draft through archive.

Acceptance Criteria:
- [ ] `campaign_content_items` and `campaign_assets` tables exist with required fields.
- [ ] Status default is `draft`; posted state requires archive timestamps.
- [ ] Assets support external link and file reference metadata.
- [ ] RLS allows creator edits in draft only (unless override policy).
- [ ] Seed indexes support status/campaign/topic filtering.
