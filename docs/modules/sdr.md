# SDR Module

## Purpose
Prospecting and outreach workspace covering pipeline overview, prospect records, draft approvals, and outreach tracking.

## Key files
- Route shell: `src/app/sdr/page.tsx`, `src/app/sdr/layout.tsx`, `src/app/sdr/sdr.css`
- Section components: `src/components/sdr/*`
- Module chatbot: `src/app/sdr/commands.ts`, `src/app/sdr/flows.ts`

## Access model
- Module ID: `sdr`
- Controlled by `useModuleAccess('sdr')`
- Visible on hub unless disabled by env/module toggles

## Data and integrations
- Reads Supabase tables: `sdr_prospects`, `sdr_approval_items`, `sdr_sends`.
- Prospect updates use `/api/sdr-prospects`.
- Approval workflow dispatch path is managed through `/api/sdr-approve`.

## Update checklist
- Keep tabs, command handlers, and flow actions aligned.
- When SDR API payloads change, update module flows and relevant contract tests.
- Update this doc if table/API ownership changes.
