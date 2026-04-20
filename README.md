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
npm run lint
```

Environment variables (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://tjaowjiccowofzisdfhr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Never commit `.env.local`.

## Branch workflow

Default branch is `staging`. Never commit directly to `main`.

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

CI verifies on every push. Do not run `npm test` as a blocking local gate.

## Layout

```
src/
  app/                  Next.js routes + CSS. One .css per module.
    accounts/           CSS only — accounts page UI lives in src/components/accounts.
    hr/                 HR page shell + hr.css
    sdr/                SDR page shell + sdr.css
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
  context/              UserContext (currently unmounted — see below)
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

`src/context/UserContext.tsx` exists but is intentionally unmounted. Cloudflare Access handles auth at the network layer for now; the Hub shows all modules to everyone via bypass until the Supabase `app_users` table is seeded. To activate, wrap children in `<UserProvider>` inside `src/app/layout.tsx`.

## Tech-debt inventory

`src/tech-debt/` — live per-page QA checklists and audits. Key files:

- `migration-audit.md` — full record of the vanilla → Next.js migration, commit by commit
- `margin-scale.md` — canonical top-margin scale (source of truth)
- `token-violations.md` — outstanding off-token values
- `qa-*.md` — per-page visual QA checklists run against staging

## Related

- `ops-dashboard` repo — legacy vanilla JS implementation (still live). Some SDR features listed in MEMORY still need manual port.
