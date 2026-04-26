# Campaigns Spec Parity Backlog (2026-04-25)

Scope: close the remaining gaps between the implemented Campaigns module and the full product specification.

Source references:
- `docs/modules/campaigns-gap-analysis-2026-04-25.md`
- `docs/modules/campaigns.md`

## Themes and Prioritization

| Theme | Outcome | Epic Coverage | Priority |
| --- | --- | --- | --- |
| T1: Workspace coherence | Campaign workspace behaves as one context-rich operations app | `CMP-PAR-E1` | P0 |
| T2: Workflow state parity | Backend/frontend state model matches review and scheduling lifecycle requirements | `CMP-PAR-E2` | P0 |
| T3: Scheduling + reminders backbone | Scheduling and reminder operations are durable and auditable | `CMP-PAR-E3` | P0 |
| T4: Permission integrity | Every action is enforced server-side with matching UI gating | `CMP-PAR-E4` | P0 |
| T5: Operational reporting clarity | Reporting covers throughput and publishing operations required by spec | `CMP-PAR-E5` | P1 |
| T6: Release confidence | E2E coverage certifies new flows before legacy cutover | `CMP-PAR-E6` | P0 |

## Epic Priority Order

1. `CMP-PAR-E2`: Workflow State and Review Durability (foundation for all downstream UI)
2. `CMP-PAR-E3`: Scheduling and Reminders Operational Backbone (depends on state parity)
3. `CMP-PAR-E4`: Permission and Authorization Matrix (must ship before broad rollout)
4. `CMP-PAR-E1`: Workspace IA and Context Integrity (build on durable contracts)
5. `CMP-PAR-E5`: Operational Reporting and Throughput Clarity
6. `CMP-PAR-E6`: E2E Certification and Legacy Cutover

## Delivery Waves

1. Wave 1 (P0 contracts): `US-CMP-BE-1301`, `US-CMP-BE-1302`, `US-CMP-BE-1401`, `US-CMP-BE-1402`, `US-CMP-BE-1501`
2. Wave 2 (P0 UX + enforcement): `US-CMP-FE-1303`, `US-CMP-FE-1201`, `US-CMP-FE-1202`, `US-CMP-FE-1203`, `US-CMP-FE-1403`, `US-CMP-FE-1404`, `US-CMP-FE-1502`
3. Wave 3 (P1 clarity + release): `US-CMP-BE-1601`, `US-CMP-FE-1602`, `US-CMP-QA-1701`, `US-CMP-ARCH-1702`

## Story Files by Epic

### CMP-PAR-E1: Workspace IA and Context Integrity
- [US-CMP-FE-1201-unified-campaign-workspace-shell-with-persistent-header.md](US-CMP-FE-1201-unified-campaign-workspace-shell-with-persistent-header.md)
- [US-CMP-FE-1202-overview-tab-next-actions-and-activity-prioritization.md](US-CMP-FE-1202-overview-tab-next-actions-and-activity-prioritization.md)
- [US-CMP-FE-1203-content-detail-side-panel-without-navigation-loss.md](US-CMP-FE-1203-content-detail-side-panel-without-navigation-loss.md)

### CMP-PAR-E2: Workflow State and Review Durability
- [US-CMP-BE-1301-normalize-campaign-content-status-model-and-migration.md](US-CMP-BE-1301-normalize-campaign-content-status-model-and-migration.md)
- [US-CMP-BE-1302-durable-review-state-fields-and-transition-audit-contract.md](US-CMP-BE-1302-durable-review-state-fields-and-transition-audit-contract.md)
- [US-CMP-FE-1303-review-queue-filters-and-actions-parity.md](US-CMP-FE-1303-review-queue-filters-and-actions-parity.md)

### CMP-PAR-E3: Scheduling and Reminders Operational Backbone
- [US-CMP-BE-1401-schedule-entry-domain-model-and-api-contract.md](US-CMP-BE-1401-schedule-entry-domain-model-and-api-contract.md)
- [US-CMP-BE-1402-reminder-v2-domain-model-and-lifecycle-statuses.md](US-CMP-BE-1402-reminder-v2-domain-model-and-lifecycle-statuses.md)
- [US-CMP-FE-1403-calendar-scheduled-vs-unscheduled-operations-view.md](US-CMP-FE-1403-calendar-scheduled-vs-unscheduled-operations-view.md)
- [US-CMP-FE-1404-dedicated-reminders-workspace-and-fast-task-actions.md](US-CMP-FE-1404-dedicated-reminders-workspace-and-fast-task-actions.md)

### CMP-PAR-E4: Permission and Authorization Matrix
- [US-CMP-BE-1501-server-side-permission-matrix-for-campaign-actions.md](US-CMP-BE-1501-server-side-permission-matrix-for-campaign-actions.md)
- [US-CMP-FE-1502-ui-gating-parity-with-server-permission-matrix.md](US-CMP-FE-1502-ui-gating-parity-with-server-permission-matrix.md)

### CMP-PAR-E5: Operational Reporting and Throughput Clarity
- [US-CMP-BE-1601-review-throughput-and-publishing-ops-metrics-contract.md](US-CMP-BE-1601-review-throughput-and-publishing-ops-metrics-contract.md)
- [US-CMP-FE-1602-reporting-tab-sections-and-empty-state-parity.md](US-CMP-FE-1602-reporting-tab-sections-and-empty-state-parity.md)

### CMP-PAR-E6: E2E Certification and Legacy Cutover
- [US-CMP-QA-1701-end-to-end-certification-for-spec-critical-campaign-journeys.md](US-CMP-QA-1701-end-to-end-certification-for-spec-critical-campaign-journeys.md)
- [US-CMP-ARCH-1702-legacy-single-page-mode-deprecation-and-route-cutover.md](US-CMP-ARCH-1702-legacy-single-page-mode-deprecation-and-route-cutover.md)
