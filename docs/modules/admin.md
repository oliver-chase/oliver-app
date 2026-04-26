# Admin Workspace

## Purpose
Admin-only workspace for app-user access control and design system navigation.

## Key files
- Route shell: `src/app/admin/page.tsx`, `src/app/admin/admin.module.css`
- Admin UI shell/components: `src/components/admin/*`
- Chatbot command/flow definitions: `src/app/admin/commands.ts`, `src/app/admin/flows.ts`
- User management APIs/helpers: `src/lib/users.ts`, `functions/api/users.js`

## Access model
- Access requires `isAdmin` from `UserContext`.
- This workspace is not part of hub module permissions.

## Data and integrations
- User role and permission updates flow through `src/lib/users.ts`.
- Token override updates use `src/lib/tokens.ts`.
- Admin chatbot also links to the Design System workspace route.

## Update checklist
- Keep permission options aligned with `getPermissionModules()` in `src/modules/registry.ts`.
- If user role model changes, update admin flows and this doc.
- Keep admin-to-design-system navigation contracts current.
