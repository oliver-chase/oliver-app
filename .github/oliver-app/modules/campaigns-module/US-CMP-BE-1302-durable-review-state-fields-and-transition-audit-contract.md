---
ID: US-CMP-BE-1302
Title: Durable review state fields and transition audit contract
Status: In Progress
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-1302
Epic: CMP-PAR-E2: Workflow State and Review Durability
---

As a reviewer and auditor
I want review lifecycle metadata stored as first-class fields
So review ownership, timing, and outcomes are durable and queryable

Acceptance Criteria:
- [ ] Content records include review state fields: submitted, claimed, approved, changes requested actor/timestamps and feedback summary.
- [ ] Backend stores durable `review_status` aligned with lifecycle transitions.
- [ ] Request-changes action requires feedback payload and persists it consistently.
- [ ] Review comments model supports comment type and resolved/unresolved state.
- [ ] Activity logging captures review events with normalized metadata shape.
- [ ] Reporting queries can compute time-in-review and changes-requested counts from persisted fields.

Execution Update (2026-04-26):
- Added durable review metadata fields on `campaign_content_items` (`review_status`, submitted/approved/changes-requested actors + timestamps, `review_feedback_summary`).
- Added `campaign_review_comments` table with typed comments and resolved/unresolved state.
- Updated review transition RPCs (`campaign_submit_for_review`, `campaign_approve_content`, `campaign_reject_content`) to persist review metadata and normalized activity metadata payloads.
- Updated reject flow persistence to ensure required feedback is consistently stored across `rejection_reason`, review summary field, and review comment rows.
