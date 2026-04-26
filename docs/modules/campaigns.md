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
- Sidebar navigation now uses route links (not in-page anchor scroll).

## Access model
- Module ID: `campaigns`
- Controlled by `useModuleAccess('campaigns')`
- Visible on hub unless disabled by env/module toggles

## Data and integrations
- Campaign CRUD/reporting operations are centralized in `src/lib/campaigns.ts`.
- Backend endpoints are implemented in `functions/api/campaigns.js` and `functions/api/campaign-jobs.js`.

## Current-state gap analysis
- Full requirement audit and E2E gap matrix: `docs/modules/campaigns-gap-analysis-2026-04-25.md`
- Campaign backlog (themes, epics, and user stories): `/.github/oliver-app/modules/campaigns-module/README.md`
- PRD user-story source map: `campaign-content-posting-module-prd.md` (stories relocated to campaign backlog map file)

## Update checklist
- Keep review queue, claim flow, calendar flow, and report flow docs synchronized.
- If campaign schemas or jobs change, update `src/types/campaigns.ts` and this doc.
- Keep module smoke tests updated for regression-critical paths.
