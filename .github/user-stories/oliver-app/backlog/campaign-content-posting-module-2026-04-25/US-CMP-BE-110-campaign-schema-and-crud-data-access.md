---
ID: US-CMP-BE-110
Title: Campaign schema and CRUD data access
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-110
Epic: CMP-E1: Campaign Management and Cadence
---

As an admin
I want campaign records with strategy metadata and lifecycle status so content can be organized by initiative.
So campaign context is first-class in the module.

Acceptance Criteria:
- [ ] `campaigns` table exists with required fields from PRD.
- [ ] Date validation enforces `end_date >= start_date` when both provided.
- [ ] CRUD wrappers exist in `src/lib/campaigns.ts`.
- [ ] All create/update actions log activity events.
- [ ] RLS restricts write access to authorized users.
