# Hub Module

## Purpose
The hub (`/`) is the entry surface that lists the modules a signed-in user can access.

## Key files
- `src/app/page.tsx`
- `src/components/hub/HubModuleList.tsx`
- `src/components/hub/HubModuleList.module.css`
- `src/modules/registry.ts`

## Access and visibility behavior
- Hub list starts from `getHubModules()`.
- Modules marked `comingSoon` are filtered out of visible cards.
- Final visibility is permission-driven via `hasPermission(module.id)`.
- Admin button is shown in the session bar for admin users.

## Operational notes
- Hub intentionally does not register module chatbot config.
- If permissions are unavailable, hub shows a restricted state and retry action.

## Update checklist
- If module visibility rules change, update `src/modules/registry.ts` and this doc.
- If hub card behavior/layout changes, update `HubModuleList` and this doc.
