# oliver-app

Next.js 16 rewrite of the vanilla-JS ops dashboard. Static-export SPA deployed to Cloudflare Pages; Supabase backend shared with ops-dashboard.

- **Staging:** staging.oliver-app.pages.dev (branch `staging`)
- **Production:** oliver-app.pages.dev (branch `main`)
- **Backend:** Supabase project `tjaowjiccowofzisdfhr.supabase.co` (PostgREST + anon key via `NEXT_PUBLIC_*` env vars)

## Stack

- Next.js 16, App Router, TypeScript strict
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
npm run test:smoke:mobile
npm run test:smoke:all
```

Environment variables (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://tjaowjiccowofzisdfhr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_DISABLED_MODULES=crm,slides   # optional CSV of hub modules to hide
```

Never commit `.env.local`.

Cloudflare Pages Function env vars (set in Pages project settings for each environment):

```
SUPABASE_URL=https://tjaowjiccowofzisdfhr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # preferred
# SUPABASE_SERVICE_KEY can be used as an alias if your environment already uses that name.
OWNER_EMAILS=<comma-separated owner emails>     # optional additive owners (kiana.micari@vtwo.co is always treated as owner)
# OWNER_USER_IDS=<comma-separated Azure oid/sub values>  # optional owner hardening
# USERS_TRUST_CLIENT_IDENTITY=1                  # local/dev only (when not behind Cloudflare Access)
# SLIDES_TRUST_CLIENT_IDENTITY=1                 # optional slides override; defaults to trusted app identity when unset
# SLIDES_TRUST_CLIENT_IDENTITY=0                 # enforce CF Access-only identity for /api/slides
# SLIDES_JOB_TOKEN=<secret>                      # optional: enables unattended scheduled approval SLA sweeps via x-slides-job-token
# SLIDES_AUTOMATION_ACTOR_USER_ID=slides-automation
# SLIDES_AUTOMATION_ACTOR_EMAIL=slides-automation@vtwo.co
# SLIDES_APPROVAL_SWEEP_MIN_INTERVAL_MINUTES=60  # optional interval throttle for scheduled sweeps (min 5)

# SDR draft approvals (/api/sdr-approve -> v-two-sdr approval-handler.yml)
SDR_GITHUB_PAT=<github token with actions:write on oliver-chase/v-two-sdr>
SDR_GITHUB_REPO=oliver-chase/v-two-sdr          # optional override
SDR_GITHUB_REF=main                             # optional override
SDR_GITHUB_WORKFLOW=approval-handler.yml        # optional override
# SDR_APPROVAL_TRUST_CLIENT_IDENTITY=1          # dev-only fallback (keep unset in staging/prod)
```

If these server-side vars are missing, the hub will show a permissions-service warning and keep module access restricted until permissions can be verified.
`/api/sdr-approve` expects Cloudflare Access identity headers in staging/prod and checks `app_users` for admin or `sdr` permission before dispatching approval workflows.

## Branch workflow

Day-to-day work happens on `staging`. `main` is the production branch.

```bash
# ship to staging
git checkout staging
git add <epic-owned paths> && git commit -m "<msg>"
git push origin staging                     # auto-deploys to staging.oliver-app.pages.dev

# promote to production (confirm with user first)
git checkout main
git merge staging --no-edit
git push origin main                         # auto-deploys to oliver-app.pages.dev
git checkout staging
```

CI verifies on every push. Local QA should use `npm run typecheck`, `npm run lint`,
`npm run build`, and `npm run test:smoke:all` for required browser smoke coverage
across desktop and mobile viewports.

## Commit and PR traceability

Use grouped commits tied to one epic ownership boundary, with story IDs and QA gate outcomes.

- Policy: `src/tech-debt/commit-grouping-and-qa-gates.md`
- Commit template: `.gitmessage` (optional setup: `git config commit.template .gitmessage`)
- PR template: `.github/pull_request_template.md`
- Release mapping: `src/tech-debt/release-traceability.md`
- Epic size guard: `npm run check-epic-size` (use `npm run check-epic-size:strict` for CI/blocking mode)

## QA workflow

- Static gates: `npm run typecheck`, `npm run lint`, `npm run build`
- `npm run lint` includes `check-module-boundaries` to enforce module isolation.
- Browser smoke (required): `npm run test:smoke:all`
- Desktop smoke only: `npm run test:smoke` (Playwright manages the local server on `127.0.0.1:3001`)
- Mobile smoke only: `npm run test:smoke:mobile` (Pixel 7 profile, same core click paths)
- Pre-push commit-size gate: `npm run check-epic-size`
- Current smoke specs: `tests/e2e/frontend-smoke.spec.ts` (desktop), `tests/e2e/mobile-clickpaths.spec.ts` (mobile)
- Deep-pass checklist: `src/tech-debt/deep-qa-workflow.md`
- Commit grouping policy: `src/tech-debt/commit-grouping-and-qa-gates.md`
- Release traceability log: `src/tech-debt/release-traceability.md`
- Generated browser artifacts must stay uncommitted: `test-results/`, `playwright-report/`

## Chatbot contract

If work changes frontend behavior or any user flow, OliverDock must be updated in the same change. Do not treat chatbot wiring as optional follow-up.

- Every user-facing chatbot action must ship with fuzzy aliases.
- Every module route must register a `conversationPath` so cross-module asks fail cleanly instead of dead-ending.
- Structured writes or multi-step tasks must use a chatbot flow that gathers the needed information inside the dock.
- Do not add chatbot redirects or popup-driven flows unless the user is explicitly asking for profile/security settings.
- If a route or workflow is added, changed, renamed, hidden, or moved, update chatbot commands, flows, aliases, and smoke coverage in the same PR.

## Layout

```
src/
  app/                  Next.js routes + CSS. One .css per module.
    accounts/           CSS only — accounts page UI lives in src/components/accounts.
    hr/                 HR page shell + hr.css
    sdr/                SDR page shell + sdr.css
    slides/             Slide editor shell + slides.css (HTML import + canvas editing workflow)
    reviews/            Self-led growth/review scaffold module shell + reviews.css
    crm/ admin/ login/ design-system/
    page.tsx            Hub (module landing page)
    layout.tsx          Root layout
    tokens.css          Design-system tokens (spacing, color, type, radius, z-index)
    globals.css         Imports tokens + per-module CSS
  components/
    accounts/           Account view, portfolio, sections, org chart, picker, chatbot
    hr/                 Dashboard, Hiring, Directory, Onboarding, Inventory,
                        Assignments, Tracks, Reports, Settings + cp-actions, step-flow
    sdr/ reviews/ crm/ admin/ layout/ shared/ auth/
  hooks/                useAccountsData, useFilterSync, useSoftDelete
  lib/                  supabase client, db helpers, export utilities
  context/              AuthContext + mounted UserContext
  modules/              Shared module registry + Oliver config defaults
  types/                Table schemas (auth, HR, accounts, SDR)
  tech-debt/            Living docs: margin-scale, token-violations, qa-*, migration-audit

functions/api/          CF Pages Functions (AI chat, parse, admin keys, SDR)
public/                 Static assets
```

## Module sections

The app is intentionally split so one module can be built or maintained with minimal cross-reading.

Hub modules (current product modules):

- Account Planning: `src/app/accounts/*` + `src/components/accounts/*`.
- HR & Hiring: `src/app/hr/*` + `src/components/hr/*` (Hiring is part of `hr`, not a separate top-level module).
- SDR: `src/app/sdr/*` + `src/components/sdr/*`.
- Slides: `src/app/slides/*` + `src/components/slides/*`.
- Campaign Content & Posting: `src/app/campaigns/*` + `src/components/campaigns/*` (skeleton route and backlog scaffolding live).

Planned module scaffolds (not currently shown on hub):

- Self-Led Growth & Review: `src/app/reviews/*` + `src/components/reviews/*` (MVP workspace live; persistence migration: `supabase/migrations/011_reviews_module_foundation.sql`).
- CRM & Business Development: `src/app/crm/*`.

Admin workspace (separate from hub modules):

- Admin + Design System pages: `src/app/admin/*`, `src/app/design-system/*`.
- Admin workspace components/config: `src/components/admin/*`, `src/modules/admin-nav.ts`, `src/modules/design-catalog.ts`.

Overarching/core layer (shared across all modules/workspaces):

- Auth and permission backbone: `src/context/*`, `src/modules/*`, `src/app/layout.tsx`.
- Shared chatbot baseline: `src/components/shared/OliverDock.tsx`, `src/components/shared/OliverContext.tsx`.
- Shared design system + visual rules: `src/app/tokens.css`, `src/app/components*.css`, margin/spacing rules, and token policies.
- Hub shell/navigation: `src/app/page.tsx`, `src/components/hub/*`.

Module boundary rules:

- Hub modules may import shared/core primitives (`shared`, `lib`, `types`, `modules`) but not other hub modules.
- Hub modules may not import admin workspace internals.
- Admin workspace may not import hub module internals.
- Feature scopes (hub modules + admin workspace) may not import hub implementation internals directly.
- Enforcement: `npm run check-module-boundaries`.

Module baseline standard (applies to every module):

- Shared baseline (always reused): design tokens/CSS contracts, shared app primitives, auth/access guard, and Oliver dock core.
- Chatbot baseline pattern: shared dock + shared registration contract (`OliverProvider`, `useRegisterOliver`) + module-local commands/flows.
- Module-specific scope: each module owns only its route shell, UI components, and module chatbot actions/flows.
- Locked visual/dev consistency (margins, spacing, token policy, dropdown patterns, etc.) applies to every page and module.
- Mobile-first baseline is mandatory across every module and shared hub surface. New routes, components, and navigation flows must be usable on phone viewports without horizontal overflow or blocked actions, and must ship with passing mobile smoke coverage.

## Design system

- **Tokens only.** Never introduce raw hex, px, or font-size values. See `src/app/tokens.css`.
- **Top-margin scale.** Canonical vertical-gap scale documented in `src/tech-debt/margin-scale.md` and mirrored in `src/app/hr/hr.css` header. Off-scale tokens (`spacing-6`, `-10`, `-12`, `-14`, `-18`) are forbidden for vertical gaps.
- **Dropdowns.** All visible dropdowns use custom pickers. Never `<select>`.
- **Template literals.** No nested template literals — use string concatenation or extracted vars.
- **No new CSS values.** If a color, size, or spacing isn't in the token set, add a token first; don't inline.

## Auth

`src/context/AuthContext.tsx` and `src/components/auth/AuthGuard.tsx` are mounted in `src/app/layout.tsx`, so the app currently expects Azure MSAL login for route access.

`src/context/UserContext.tsx` is also mounted. It resolves the signed-in Azure user through `/api/users`, auto-upserting a default `app_users` row when that backend is available. Owner identities from `OWNER_EMAILS`/`OWNER_USER_IDS` are always enforced as admin with full module access.

## Tech-debt inventory

`src/tech-debt/` — live per-page QA checklists and audits. Key files:

- `migration-audit.md` — full record of the vanilla → Next.js migration, commit by commit
- `margin-scale.md` — canonical top-margin scale (source of truth)
- `token-violations.md` — outstanding off-token values
- `slides-backlog.md` — slides/module epic-ticket backlog with journey gap mapping
- `auth-permissions-runbook.md` — owner/admin bootstrap and verification checklist
- `deep-qa-workflow.md` — repeatable full-repo QA sequence
- `qa-*.md` — per-page visual QA checklists run against staging

## Related

- `ops-dashboard` repo — legacy vanilla JS implementation (still live). Some SDR features listed in MEMORY still need manual port.
- `scripts/setup-app-users.sql` + `scripts/dedupe-app-users.sql` — owner bootstrap and one-time identity cleanup helpers.
