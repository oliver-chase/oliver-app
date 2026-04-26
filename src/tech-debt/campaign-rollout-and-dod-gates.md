# Campaign Query, Rollout, and DoD Gates

Date: 2026-04-26  
Scope: Campaign Content & Posting module (`/campaigns`)

## US-CMP-BE-1010 Query/index tuning and explain-plan gates

Status: Done

### Core query/index coverage

- [x] `campaign_content_items` list/status/schedule queries backed by:
  - `campaign_content_status_idx`
  - `campaign_content_campaign_status_idx`
  - `campaign_content_owner_status_idx`
  - partial indexes for `unclaimed` and `claimed`
- [x] asset and activity scans backed by:
  - `campaign_assets_campaign_idx`
  - `campaign_assets_content_idx`
  - `campaign_activity_entity_idx`
  - `campaign_activity_action_idx`
- [x] report export lookup/dedupe backed by:
  - `campaign_report_exports_user_idx`
  - `campaign_report_exports_fingerprint_idx` (migration `015`)

### Explain-plan review procedure

Run these in staging before each major campaign release:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.campaign_content_items
WHERE status = 'unclaimed'
ORDER BY updated_at DESC
LIMIT 100;

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.campaign_content_items
WHERE campaign_id = '<campaign-id>'
  AND status IN ('claimed', 'posted')
ORDER BY scheduled_for NULLS LAST, updated_at DESC;

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, requested_by_user_id, status, requested_at
FROM public.campaign_report_exports
WHERE requested_by_user_id = '<user-id>'
  AND request_fingerprint = '<fingerprint>'
ORDER BY requested_at DESC
LIMIT 1;
```

### Slow-query thresholds

- `campaign_content_items` list/filter queries: p95 <= 300ms.
- `campaign_report_exports` dedupe/list queries: p95 <= 200ms.
- Report summary generation query batch (`/api/campaigns`): p95 <= 1200ms for <= 10k rows.

### Index bloat and maintenance notes

- Monitor bloat monthly:

```sql
SELECT *
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname LIKE 'campaign_%'
ORDER BY idx_scan ASC;
```

- Reindex low-scan/high-size indexes during maintenance windows.
- Keep index additions additive; no destructive drops during release windows.

### Rollback-safe migration strategy

- Migrations `014` and `015` are additive (`CREATE ... IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`).
- Emergency rollback:
  - keep function-level kill path by disabling module visibility (`NEXT_PUBLIC_DISABLED_MODULES=campaigns`) and/or disabling chatbot command use.
  - if required, drop only new function/index/column from `015` after module disable.

## US-CMP-QA-1111 Rollout controls and migration safety

Status: In Progress

- [x] Feature-flag controls available via module toggles (`NEXT_PUBLIC_DISABLED_MODULES`, `NEXT_PUBLIC_ENABLED_MODULES`, `NEXT_PUBLIC_HUB_VISIBLE_MODULES`).
- [x] DB migrations are additive and backward-compatible (`014`, `015`).
- [x] Function-level rollback path exists:
  - disable module visibility;
  - keep schema in place;
  - restore prior `/api/campaigns` behavior by reverting function code only.
- [x] No data backfill required for `015`; missing `request_fingerprint` is safely nullable and API degrades gracefully.
- [ ] Staging signoff checklist execution (manual release gate). *(tracked by US-CMP-QA-1114, priority: High)*

### Staging signoff checklist

- [ ] Run campaign e2e suite on staging deployment.
- [ ] Confirm `/api/campaigns` export dedupe behavior with repeated export requests.
- [ ] Confirm admin override action writes activity log row with `content-admin-override`.
- [ ] Confirm migrations `014` and `015` present and healthy.
- [ ] Confirm module visibility flags in staging/prod env config.
- [ ] Record evidence in `campaign-staging-signoff-evidence-2026-04-26.md`.
- [ ] Execute with fixed-port commands in blocked environments if needed (`npm run test:smoke:campaigns`, `npm run test:smoke:campaigns:frontend`, `npm run test:smoke:campaigns:mobile`).

## US-CMP-QA-1112 MVP DoD verification checklist

Status: In Progress

- [x] PRD DoD to ticket evidence mapped in `campaign-content-posting-backlog.md` execution ledger.
- [x] Contributor/reviewer/admin scenario coverage exists in campaign Playwright suite.
- [x] Activity log + state validation + permission checks covered via RPC validation and e2e conflict/override flows.
- [ ] ICS import manually verified on both macOS Calendar and Windows Outlook. *(tracked by US-CMP-QA-1113, priority: High)*
- [x] Reporting/export outputs validated against contract fixture tests (`tests/contracts/campaigns-api.contract.test.mjs`) and campaign e2e flows.

### Remaining manual validation

- macOS Calendar import check for generated `.ics` files.
- Windows Outlook import check for generated `.ics` files.
- Final staging release signoff capture. *(tracked by US-CMP-QA-1114, priority: High)*
