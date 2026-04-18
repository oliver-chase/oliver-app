## oliver-app: Next.js 15 Rewrite

**Purpose:** Next.js 15 rewrite of ops-dashboard (accounts, HR, SDR, admin, chatbot)
**Repo:** oliver-chase/oliver-app | **Local:** ~/projects/oliver-app
**Live:** oliver-app.pages.dev (main) | Staging: staging.oliver-app.pages.dev (staging branch)

**Tech Stack:**
- Next.js 15 App Router, TypeScript, static export (output: 'export')
- Build: `npm run build` → output to `out/`
- Supabase backend (same as ops-dashboard): tjaowjiccowofzisdfhr.supabase.co
- Design system: tokens.css, components-*.css (shared with ops-dashboard)

**Branch Workflow:**
- Default working branch: `staging`
- Build & test on staging branch → merge to main only after verification
- `git push origin staging` deploys to staging.oliver-app.pages.dev

**Key Commands:**
- `npm run build` — build and verify no errors
- `git checkout staging` — switch to staging branch before committing
- `git add -A && git commit -m "message" && git push origin staging` — commit to staging

**Code Style:**
- TypeScript strict mode (no `any` unless unavoidable)
- No nested template literals
- No new CSS values — use existing design tokens only
- No `npm test` locally — push to staging and verify on live URL

**Key Files:**
- `src/lib/supabase.ts` — Supabase client
- `src/types/index.ts` — all table schemas
- `src/hooks/useAccountsData.ts` — data fetching

**Structure:**
- `src/app/` — pages, layout, global styles (tokens.css, components-*.css)
- `src/components/` — React components by feature (accounts/, hr/, sdr/, admin/)
- `functions/api/` — Cloudflare Pages Functions (chat, parse-document, parse-image, etc.)
- `src/context/` — UserContext, auth bypass
- `out/` — static build output
