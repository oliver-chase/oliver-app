# HR Module

## Purpose
People Ops workspace for hiring, directory, onboarding/offboarding, inventory, assignments, tracks, reports, and settings.

## Key files
- Route shell and nav orchestration: `src/app/hr/page.tsx`, `src/app/hr/layout.tsx`, `src/app/hr/hr.css`
- Section components: `src/components/hr/*`
- Module chatbot: `src/app/hr/commands.ts`, `src/app/hr/flows.ts`
- Step-flow system: `src/components/hr/StepFlowRunner.tsx`, `src/components/hr/flows/*`

## Access model
- Module ID: `hr`
- Controlled by `useModuleAccess('hr')`
- Visible on hub unless disabled by env/module toggles

## Data and integrations
- Reads/writes Supabase entities for candidates, employees, devices, assignments, tracks, tasks, onboarding runs, interviews, activities, and lists.
- Receipt upload parser runs inside module flow and can create inventory records.

## Update checklist
- Keep page tabs, flow handlers, and chatbot command targets in sync.
- If table names/contracts change, update `src/components/hr/types.ts` and this doc.
- Re-run mobile smoke when nav/sidebar behavior changes.
