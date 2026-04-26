# Campaigns Module

## Purpose
Campaign content operations: campaign setup, draft creation, review queue, claiming, scheduling, posting, reminders, and reporting.

## Key files
- Route shell: `src/app/campaigns/page.tsx`, `src/app/campaigns/layout.tsx`, `src/app/campaigns/campaigns.css`
- Sidebar subpage route entries:
  - `src/app/campaigns/campaigns/page.tsx`
  - `src/app/campaigns/content/page.tsx`
  - `src/app/campaigns/review-queue/page.tsx`
  - `src/app/campaigns/calendar/page.tsx`
  - `src/app/campaigns/reminders/page.tsx`
  - `src/app/campaigns/reports/page.tsx`
  - `src/app/campaigns/automation/page.tsx`
- Landing component: `src/components/campaigns/CampaignsLanding.tsx`
- Module chatbot: `src/app/campaigns/commands.ts`, `src/app/campaigns/flows.ts`
- Data/service layer: `src/lib/campaigns.ts`

## Route model
- Unified workspace route: `/campaigns` (legacy all-sections workspace for compatibility and existing test coverage).
- Sidebar subpage routes (URL-addressable module views):
  - `/campaigns/campaigns`
  - `/campaigns/content`
  - `/campaigns/review-queue`
  - `/campaigns/calendar`
  - `/campaigns/reminders`
  - `/campaigns/reports`
  - `/campaigns/automation`
- Sidebar navigation now uses route links (not in-page anchor scroll).

## Access model
- Module ID: `campaigns`
- Controlled by `useModuleAccess('campaigns')`
- Visible on hub unless disabled by env/module toggles

## Data and integrations
- Campaign CRUD/reporting operations are centralized in `src/lib/campaigns.ts`.
- Backend endpoints are implemented in `functions/api/campaigns.js` and `functions/api/campaign-jobs.js`.
- Automation surfaces include journey canvas publish/version tracking and execution timeline/export through existing campaign APIs.
- Automation workspace also includes planning-board, focus-item, and segment-builder operations persisted in campaign cadence metadata with audit events.

## Data lineage (current state)
- Primary source of truth is Supabase campaign domain tables (`campaigns`, `campaign_content_items`, `campaign_assets`, `campaign_activity_log`, `campaign_reminders`, export/history tables).
- Automation read surfaces (`/campaigns/automation`, `/campaigns/reports`) call `functions/api/campaigns.js` actions:
  - `get-report-summary`
  - `get-journey-timeline`
  - `get-segment-estimate`
- Automation write surfaces currently persist through campaign updates (`cadence_rule` payload sections for journey graph, planning board, focus-item configs, segment definitions) plus activity-log events for traceability.
- Reminder and missed-post operational telemetry is produced in `functions/api/campaign-jobs.js` using campaign content and activity rows.

## Data lineage gaps (current state)
- There is no fully normalized source-ledger that maps post/search/research evidence to each automation decision across all surfaces.
- Search/research evidence provenance and confidence/coverage indicators are partial and not yet consistently surfaced in every campaign view.
- Backlog coverage for these gaps is tracked in `CMP-T19` (ingestion contracts + lineage APIs + UI provenance indicators).

## Current-state gap analysis
- Full requirement audit and E2E gap matrix: `docs/modules/campaigns-gap-analysis-2026-04-25.md`
- E14A implementation gap analysis and residual-risk ledger: `docs/modules/campaigns-gap-analysis-2026-04-26-e14a.md`
- Campaign backlog (themes, epics, and user stories): `/.github/oliver-app/modules/campaigns-module/README.md`
- PRD user-story source map: `campaign-content-posting-module-prd.md` (stories relocated to campaign backlog map file)

## Update checklist
- Keep review queue, claim flow, calendar flow, and report flow docs synchronized.
- If campaign schemas or jobs change, update `src/types/campaigns.ts` and this doc.
- Keep module smoke tests updated for regression-critical paths.
