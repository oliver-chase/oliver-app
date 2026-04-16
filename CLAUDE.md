@AGENTS.md

# oliver-app — Claude Code session protocol

## Project
Next.js 15 rewrite of ops-dashboard. TypeScript, App Router, static export.
**Repo:** oliver-chase/oliver-app
**Staging:** staging.oliver-app.pages.dev (staging branch)
**Production:** oliver-app.pages.dev (main branch)
**Backend:** Same Supabase as ops-dashboard — tjaowjiccowofzisdfhr.supabase.co

## Branch Workflow

**Default working branch is `staging`. Never commit directly to `main`.**

### "push to staging"
```bash
git add -A
git commit -m "<message>"
git push origin staging
```
Deploys automatically to staging.oliver-app.pages.dev.

### "merge staging"
```bash
git checkout main
git merge staging --no-edit
git push origin main
git checkout staging
```
Deploys automatically to oliver-app.pages.dev (production).

Always confirm the user means to ship to production before running "merge staging".

## Stack
- Next.js 15 App Router, TypeScript, static export (`output: 'export'` in next.config.ts)
- Build output: `out/` — CF Pages build command: `npm run build`, output dir: `out`
- Supabase client: `src/lib/supabase.ts` (browser-only, NEXT_PUBLIC_ env vars)
- Types: `src/types/index.ts` — all table schemas
- Data hook: `src/hooks/useAccountsData.ts`

## Key rules
- All work starts on `staging` branch — verify with `git branch --show-current`
- No `npm test` locally — push to staging and verify on the live URL
- Same design system as ops-dashboard: tokens.css, components*.css, accounts.css — no new CSS values
- No nested template literals
- TypeScript strict — no `any` unless unavoidable
