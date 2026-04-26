# Campaign Content Posting Module Backlog

Date: 2026-04-25
Source: `src/tech-debt/campaign-content-posting-backlog.md`
Story Count: 38

## Epic Coverage
- CMP-E0: Module Foundation and Access — 3 tickets
- CMP-E1: Campaign Management and Cadence — 3 tickets
- CMP-E2: Content Drafting and Asseting — 3 tickets
- CMP-E3: Review Queue and Approval Integrity — 3 tickets
- CMP-E4: Content Library, Search, and Discovery — 3 tickets
- CMP-E5: Claiming, Scheduling, and Posting Execution — 4 tickets
- CMP-E6: Reminders, Missed Posts, and Notification Jobs — 4 tickets
- CMP-E7: Reporting and Export — 3 tickets
- CMP-E8: Chatbot Parity and Guided Workflows — 3 tickets
- CMP-E9: Auditability, Validation, and Error Recovery — 3 tickets
- CMP-E10: Performance and Scale Hardening — 3 tickets
- CMP-E11: QA, Rollout, and Definition of Done Gates — 3 tickets

## Ticket Story Files
- [US-CMP-ARCH-001-register-campaigns-module-and-route-shell.md](US-CMP-ARCH-001-register-campaigns-module-and-route-shell.md)
- [US-CMP-ARCH-002-extend-permissions-across-frontend-and-backend.md](US-CMP-ARCH-002-extend-permissions-across-frontend-and-backend.md)
- [US-CMP-ARCH-003-update-module-boundary-enforcement.md](US-CMP-ARCH-003-update-module-boundary-enforcement.md)
- [US-CMP-BE-110-campaign-schema-and-crud-data-access.md](US-CMP-BE-110-campaign-schema-and-crud-data-access.md)
- [US-CMP-FE-111-campaign-list-and-detail-screens.md](US-CMP-FE-111-campaign-list-and-detail-screens.md)
- [US-CMP-FE-112-cadence-rule-editor-and-open-slot-visualization.md](US-CMP-FE-112-cadence-rule-editor-and-open-slot-visualization.md)
- [US-CMP-BE-210-content-and-asset-schema-foundation.md](US-CMP-BE-210-content-and-asset-schema-foundation.md)
- [US-CMP-FE-211-create-edit-draft-workflow.md](US-CMP-FE-211-create-edit-draft-workflow.md)
- [US-CMP-FE-212-asset-add-remove-and-display-in-detail-posting-views.md](US-CMP-FE-212-asset-add-remove-and-display-in-detail-posting-views.md)
- [US-CMP-BE-310-review-lifecycle-rpc-transitions.md](US-CMP-BE-310-review-lifecycle-rpc-transitions.md)
- [US-CMP-FE-311-review-queue-ui.md](US-CMP-FE-311-review-queue-ui.md)
- [US-CMP-FE-312-reviewer-decision-modals-and-creator-feedback-display.md](US-CMP-FE-312-reviewer-decision-modals-and-creator-feedback-display.md)
- [US-CMP-FE-410-role-aware-default-library-views.md](US-CMP-FE-410-role-aware-default-library-views.md)
- [US-CMP-FE-411-library-filter-bar.md](US-CMP-FE-411-library-filter-bar.md)
- [US-CMP-BE-412-search-query-support-and-indexing.md](US-CMP-BE-412-search-query-support-and-indexing.md)
- [US-CMP-BE-510-claim-unclaim-transactional-logic.md](US-CMP-BE-510-claim-unclaim-transactional-logic.md)
- [US-CMP-FE-511-claim-and-schedule-interaction-model.md](US-CMP-FE-511-claim-and-schedule-interaction-model.md)
- [US-CMP-FE-512-posting-ready-detail-and-mark-posted-action.md](US-CMP-FE-512-posting-ready-detail-and-mark-posted-action.md)
- [US-CMP-BE-513-post-url-update-contract-after-archive.md](US-CMP-BE-513-post-url-update-contract-after-archive.md)
- [US-CMP-BE-610-reminder-records-and-ics-payload-generation.md](US-CMP-BE-610-reminder-records-and-ics-payload-generation.md)
- [US-CMP-BE-611-daily-reminder-dispatch-job.md](US-CMP-BE-611-daily-reminder-dispatch-job.md)
- [US-CMP-BE-612-missed-post-detection-job-and-computed-flag.md](US-CMP-BE-612-missed-post-detection-job-and-computed-flag.md)
- [US-CMP-FE-613-calendar-schedule-view-with-missed-highlighting.md](US-CMP-FE-613-calendar-schedule-view-with-missed-highlighting.md)
- [US-CMP-BE-710-report-metrics-query-layer.md](US-CMP-BE-710-report-metrics-query-layer.md)
- [US-CMP-FE-711-report-dashboard-ui-and-filter-controls.md](US-CMP-FE-711-report-dashboard-ui-and-filter-controls.md)
- [US-CMP-BE-712-export-job-contract-html-markdown-first-pdf-optional.md](US-CMP-BE-712-export-job-contract-html-markdown-first-pdf-optional.md)
- [US-CMP-CHAT-810-campaign-command-and-alias-map.md](US-CMP-CHAT-810-campaign-command-and-alias-map.md)
- [US-CMP-CHAT-811-guided-claim-create-summary-flows.md](US-CMP-CHAT-811-guided-claim-create-summary-flows.md)
- [US-CMP-CHAT-812-conversation-scope-and-path-guard-updates.md](US-CMP-CHAT-812-conversation-scope-and-path-guard-updates.md)
- [US-CMP-BE-910-unified-activity-logging-model.md](US-CMP-BE-910-unified-activity-logging-model.md)
- [US-CMP-BE-911-backend-transition-validator-and-error-taxonomy.md](US-CMP-BE-911-backend-transition-validator-and-error-taxonomy.md)
- [US-CMP-FE-912-loading-success-and-failure-state-standardization.md](US-CMP-FE-912-loading-success-and-failure-state-standardization.md)
- [US-CMP-BE-1010-query-index-tuning-and-explain-plan-gates.md](US-CMP-BE-1010-query-index-tuning-and-explain-plan-gates.md)
- [US-CMP-FE-1011-data-fetch-batching-and-cache-invalidation-strategy.md](US-CMP-FE-1011-data-fetch-batching-and-cache-invalidation-strategy.md)
- [US-CMP-BE-1012-idempotency-and-dedupe-for-reminders-exports.md](US-CMP-BE-1012-idempotency-and-dedupe-for-reminders-exports.md)
- [US-CMP-QA-1110-story-and-test-coverage-baseline.md](US-CMP-QA-1110-story-and-test-coverage-baseline.md)
- [US-CMP-QA-1111-rollout-controls-and-migration-safety.md](US-CMP-QA-1111-rollout-controls-and-migration-safety.md)
- [US-CMP-QA-1112-mvp-dod-verification-checklist.md](US-CMP-QA-1112-mvp-dod-verification-checklist.md)
