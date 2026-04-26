# Campaigns Module

## Purpose
Campaign content operations: campaign setup, draft creation, review queue, claiming, scheduling, posting, reminders, and reporting.

## Key files
- Route shell: `src/app/campaigns/page.tsx`, `src/app/campaigns/layout.tsx`, `src/app/campaigns/campaigns.css`
- Landing component: `src/components/campaigns/CampaignsLanding.tsx`
- Module chatbot: `src/app/campaigns/commands.ts`, `src/app/campaigns/flows.ts`
- Data/service layer: `src/lib/campaigns.ts`

## Access model
- Module ID: `campaigns`
- Controlled by `useModuleAccess('campaigns')`
- Visible on hub unless disabled by env/module toggles

## Data and integrations
- Campaign CRUD/reporting operations are centralized in `src/lib/campaigns.ts`.
- Backend endpoints are implemented in `functions/api/campaigns.js` and `functions/api/campaign-jobs.js`.

## Update checklist
- Keep review queue, claim flow, calendar flow, and report flow docs synchronized.
- If campaign schemas or jobs change, update `src/types/campaigns.ts` and this doc.
- Keep module smoke tests updated for regression-critical paths.
