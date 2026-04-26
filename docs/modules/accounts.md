# Accounts Module

## Purpose
Strategic account planning: portfolio, stakeholders, notes, actions, opportunities, projects, and exports.

## Key files
- Route shell: `src/app/accounts/page.tsx`, `src/app/accounts/layout.tsx`
- Main UI orchestrator: `src/components/accounts/AccountsApp.tsx`
- Module chatbot: `src/app/accounts/commands.ts`, `src/app/accounts/flows.ts`
- Data hook: `src/hooks/useAccountsData.ts`
- Data layer: `src/lib/db.ts`

## Access model
- Module ID: `accounts`
- Controlled by `useModuleAccess('accounts')`
- Visible on hub unless disabled by env/module toggles

## Data and integrations
- Supabase tables loaded together: `accounts`, `engagements`, `stakeholders`, `actions`, `notes`, `opportunities`, `projects`, `background`.
- Transcript/image parsing paths call `/api/parse-document` and `/api/parse-image`.

## Update checklist
- Keep chatbot command aliases and flows aligned with all mutation surfaces.
- If table contracts change, update `src/types/index.ts` and `src/lib/db.ts`.
- Update this doc when route/component ownership changes.
