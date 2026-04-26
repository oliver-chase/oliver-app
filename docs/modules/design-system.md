# Design System Workspace

## Purpose
Admin workspace for token governance, component catalog reference, and style-system QA surfaces.

## Key files
- Route shell: `src/app/design-system/page.tsx`, `src/app/design-system/ds.css`
- Catalog metadata: `src/modules/design-catalog.ts`, `src/modules/admin-nav.ts`
- Token data layer: `src/lib/tokens.ts`

## Access model
- Access is admin-scoped via workspace navigation.
- This workspace is not part of hub module permissions.

## Data and integrations
- Token overrides are loaded/saved against Supabase `design_tokens`.
- Workspace includes usage-audit and catalog metadata used for design-system maintenance.

## Update checklist
- Keep token name lists synchronized with `src/app/tokens.css` and override pathways.
- If catalog metadata changes, update `src/modules/design-catalog.ts` and this doc.
- Update this doc for any new governance or audit surfaces.
