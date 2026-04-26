---
ID: SLD-BE-150
Title: Unsaved-Change Telemetry Ingestion and Metrics Contract
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a platform maintainer
I want backend ingestion and query support for unsaved-change telemetry
So discard-risk trends and reliability KPIs are measurable and auditable

Acceptance Criteria:
- [ ] Backend endpoint or pipeline accepts structured unsaved-change telemetry events with schema validation.
- [ ] Storage model supports time-series aggregation by module, actor role, and event type.
- [ ] Query contract exposes discard rate, retry rate, and prompt-cancel rate over selectable date windows.
- [ ] Retention and privacy controls are documented for telemetry payload fields.
- [ ] Operational alert thresholds can be configured for elevated discard-risk trends.
