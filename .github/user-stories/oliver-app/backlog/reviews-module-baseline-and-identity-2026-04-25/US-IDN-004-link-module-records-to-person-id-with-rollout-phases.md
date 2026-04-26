---
ID: US-IDN-004
Title: Link Module Records to person_id with Rollout Phases
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a platform engineer
I want module records progressively linked to `person_id`
So cross-module profile assembly works without risky big-bang schema rewrites

Acceptance Criteria:
- [ ] Rollout phases are defined (Phase 1: reviews + app_users bridge, Phase 2: HR/Hiring assets, Phase 3: accounts ownership links, Phase 4: CRM).
- [ ] Reviews records are first-class linked through `person_id` path, with compatibility for existing `owner_user_id`.
- [ ] For each module phase, story defines schema updates, backfill plan, and API contract updates.
- [ ] No phase introduces name/email-based joins as primary linkage.
- [ ] Access control remains module-permission based even when person linkage is shared.
- [ ] Cross-phase data integrity checks are specified and automatable.
- [ ] Story includes deprecation plan for legacy join fields after migration completion.

