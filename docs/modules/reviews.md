# Reviews Module

## Purpose
Self-led growth and review workflows: goals, progress updates, quarterly reflections, and annual self-review drafts.

## Key files
- Route shell: `src/app/reviews/page.tsx`, `src/app/reviews/layout.tsx`, `src/app/reviews/reviews.css`
- Landing component and types: `src/components/reviews/ReviewsLanding.tsx`, `src/components/reviews/types.ts`
- Module chatbot: `src/app/reviews/commands.ts`, `src/app/reviews/flows.ts`
- Data/service layer: `src/lib/reviews.ts`

## Access model
- Module ID: `reviews`
- Registry state: `comingSoon: true`, `showInHub: false`
- Access behavior: only admins can access while module is marked `comingSoon`

## Data and integrations
- Persistence and reads route through `src/lib/reviews.ts`.
- Migration dependency is documented in the module UI error state: `supabase/migrations/011_reviews_module_foundation.sql`.

## Update checklist
- If module graduates from coming-soon status, update `src/modules/registry.ts` and this doc.
- Keep schema/policy error guidance current with Supabase policies.
- Keep chatbot commands/flows aligned with goals, updates, quarterly, and annual actions.
