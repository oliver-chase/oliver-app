---
ID: US-CMP-FE-1803
Title: Narrative brief approval gate and planning surface
Status: Not Started
Verified: false
Backdated: 2026-04-26
Ticket: CMP-FE-1803
Epic: CMP-E12: Social Calendar Intelligence Automation (No-API / No-Claude-Dependency)
---

As a campaign manager
I want a mandatory narrative-brief approval step before content generation
So monthly output reflects intentional positioning and not unchecked automation

Acceptance Criteria:
- [ ] Planning UI shows a generated narrative brief with sections for ICP signals, pain points, monthly theme, and platform strategy notes.
- [ ] Brief includes 3 to 6 proposed content pillars, each with rationale and evidence references.
- [ ] Manager can approve, reject, or request revision with required comment when rejecting or requesting revision.
- [ ] Content generation is blocked until brief status is `approved`.
- [ ] Brief revisions maintain full version history with diffable fields and actor/timestamp metadata.
- [ ] UI surfaces unresolved risk flags (insufficient evidence, low confidence topics, sparse competitor coverage) before approval.
- [ ] Pillar allocation controls allow manager to set target post counts by pillar and by platform.
- [ ] Approval action triggers a signed execution snapshot linking approved brief version to downstream generated artifacts.
- [ ] Re-approval is required when core inputs change (brand URL, month, channels, ICP hint, competitor set).
- [ ] Mobile and desktop layouts preserve readability of citations, pillar allocations, and approval controls without truncation.

Executable Delivery Requirements:
- [ ] Add persistent brief version model with status transitions (`draft`, `needs_revision`, `approved`, `superseded`).
- [ ] Add UI component set for pillar allocation with validation of total planned volume by platform.
- [ ] Add transition guard in generation start path that rejects unapproved or stale brief versions.
- [ ] Add e2e coverage for approve/reject/revise/approve loop and stale-input forced reapproval flow.
- [ ] Add accessibility checks for citations and approval controls at mobile and desktop breakpoints.
