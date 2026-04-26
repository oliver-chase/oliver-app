---
ID: SLD-BE-440
Title: Template Approval SLA and Escalation Automation
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As a platform maintainer
I want SLA-based automation for pending template approvals
So stale requests trigger deterministic escalation and do not remain unresolved indefinitely

Acceptance Criteria:
- [x] Approval records include SLA deadline and escalation state fields.
- [x] Scheduled process flags overdue approvals and writes escalation audit events.
- [ ] Escalation routing supports configurable admin targets and notification channels.
- [x] API exposes SLA status fields for queue rendering and requester visibility.
- [x] Escalation processing is idempotent and safe under retries.

QA / Evidence:
- `functions/api/slides.js`:
  - `executeApprovalEscalationSweep` applies overdue threshold (48h), cooldown (24h), updates `payload` with `escalations`, `escalation_count`, and `last_escalated_at`.
- `functions/api/slides.js`:
  - Sweep writes `escalate-approval` audit events, stores heartbeat events for scheduled runs (`readLatestScheduledSweepHeartbeat`) and supports throttling (`sweep_source`, `scheduled`).
- `functions/api/slides.js`:
  - `handleEscalateTemplateApprovalAction` records manual escalation metadata and appends escalation entries.
- `functions/api/slides.js`:
  - `resource=template-approvals` GET path supports status filtering and role-scope protections for requester/admin visibility.
- `tests/e2e/slides-regression.spec.ts`:
  - `SLD-FE-440 and SLD-BE-440 show SLA aging and support approval escalation reminders`
  - `SLD-BE-440 admin escalation sweep escalates overdue approvals without manual prompts`
- `tests/e2e/slides-regression.spec.ts`: `SLD-BE-440` assertions confirm escalation count and sweep behavior.
- Verification status:
  - Attempted: `PLAYWRIGHT_WEB_SERVER_PORT=3002 npx playwright test tests/e2e/slides-regression.spec.ts -g "SLD-BE-440 admin escalation sweep escalates overdue approvals without manual prompts" --workers=1`
  - Blocked by sandbox web-server start error `EPERM: operation not permitted 0.0.0.0:3002`.
  - Remaining AC gap: no configurable notification destination/channel plumbing was confirmed in current implementation.
  - Action item: add configurable admin routing map and channel adapter (`email`/`slack`/`in-app`) before state transition to Done.
