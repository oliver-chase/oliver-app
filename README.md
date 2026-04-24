# oliver-app

Next.js 15 rewrite of the vanilla-JS ops dashboard. Static-export SPA deployed to Cloudflare Pages; Supabase backend shared with ops-dashboard.

- **Staging:** staging.oliver-app.pages.dev (branch `staging`)
- **Production:** oliver-app.pages.dev (branch `main`)
- **Backend:** Supabase project `tjaowjiccowofzisdfhr.supabase.co` (PostgREST + anon key via `NEXT_PUBLIC_*` env vars)

## Stack

- Next.js 15, App Router, TypeScript strict
- Static export — `output: 'export'` in `next.config.ts`; build output `out/`
- CSS tokens in `src/app/tokens.css`; per-module styles in `src/app/<module>/<module>.css`
- No runtime server. All data access is client-side Supabase via `src/lib/supabase.ts`
- Serverless functions under `functions/api/` run on CF Pages Functions (not Next.js routes)

## Getting started

```bash
npm install
npm run dev          # localhost:3000
npm run build        # produces out/
npm run lint         # token policy + story schema checks
npm run typecheck
npm run test:smoke   # starts/uses localhost:3001 automatically
```

Environment variables (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://tjaowjiccowofzisdfhr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_DISABLED_MODULES=crm,slides   # optional CSV of hub modules to hide
```

Never commit `.env.local`.

## Branch workflow

Day-to-day work happens on `staging`. `main` is the production branch.

```bash
# ship to staging
git checkout staging
git add -A && git commit -m "<msg>"
git push origin staging                     # auto-deploys to staging.oliver-app.pages.dev

# promote to production (confirm with user first)
git checkout main
git merge staging --no-edit
git push origin main                         # auto-deploys to oliver-app.pages.dev
git checkout staging
```

CI verifies on every push. Local QA should use `npm run typecheck`, `npm run lint`,
`npm run build`, and `npm run test:smoke` for browser smoke coverage.

## QA workflow

- Static gates: `npm run typecheck`, `npm run lint`, `npm run build`
- Browser smoke: `npm run test:smoke` (Playwright manages the local server on `127.0.0.1:3001`)
- Current smoke spec: `tests/e2e/frontend-smoke.spec.ts`
- Deep-pass checklist: `src/tech-debt/deep-qa-workflow.md`
- Generated browser artifacts must stay uncommitted: `test-results/`, `playwright-report/`

## Layout

```
src/
  app/                  Next.js routes + CSS. One .css per module.
    accounts/           CSS only — accounts page UI lives in src/components/accounts.
    hr/                 HR page shell + hr.css
    sdr/                SDR page shell + sdr.css
    slides/             Slide editor shell + slides.css (HTML import scaffold)
    crm/ admin/ login/ design-system/
    page.tsx            Hub (module landing page)
    layout.tsx          Root layout
    tokens.css          Design-system tokens (spacing, color, type, radius, z-index)
    globals.css         Imports tokens + per-module CSS
  components/
    accounts/           Account view, portfolio, sections, org chart, picker, chatbot
    hr/                 Dashboard, Hiring, Directory, Onboarding, Inventory,
                        Assignments, Tracks, Reports, Settings + cp-actions, step-flow
    sdr/ crm/ admin/ layout/ shared/ auth/
  hooks/                useAccountsData, useFilterSync, useSoftDelete
  lib/                  supabase client, db helpers, export utilities
  context/              AuthContext + mounted UserContext
  modules/              Shared module registry + Oliver config defaults
  types/                Table schemas (auth, HR, accounts, SDR)
  tech-debt/            Living docs: margin-scale, token-violations, qa-*, migration-audit

functions/api/          CF Pages Functions (AI chat, parse, admin keys, SDR)
public/                 Static assets
```

## Design system

- **Tokens only.** Never introduce raw hex, px, or font-size values. See `src/app/tokens.css`.
- **Top-margin scale.** Canonical vertical-gap scale documented in `src/tech-debt/margin-scale.md` and mirrored in `src/app/hr/hr.css` header. Off-scale tokens (`spacing-6`, `-10`, `-12`, `-14`, `-18`) are forbidden for vertical gaps.
- **Dropdowns.** All visible dropdowns use custom pickers. Never `<select>`.
- **Template literals.** No nested template literals — use string concatenation or extracted vars.
- **No new CSS values.** If a color, size, or spacing isn't in the token set, add a token first; don't inline.

## Auth

`src/context/AuthContext.tsx` and `src/components/auth/AuthGuard.tsx` are mounted in `src/app/layout.tsx`, so the app currently expects Azure MSAL login for route access.

`src/context/UserContext.tsx` is also mounted. It resolves the signed-in Azure user through `/api/users`, auto-upserting a default `app_users` row when that backend is available. If the users API is unavailable, the hub falls back to the unrestricted module view and admin behavior remains config-dependent.

## Tech-debt inventory

`src/tech-debt/` — live per-page QA checklists and audits. Key files:

- `migration-audit.md` — full record of the vanilla → Next.js migration, commit by commit
- `margin-scale.md` — canonical top-margin scale (source of truth)
- `token-violations.md` — outstanding off-token values
- `deep-qa-workflow.md` — repeatable full-repo QA sequence
- `qa-*.md` — per-page visual QA checklists run against staging

## Related

- `ops-dashboard` repo — legacy vanilla JS implementation (still live). Some SDR features listed in MEMORY still need manual port.
