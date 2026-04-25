@AGENTS.md

# oliver-app — Claude Code session protocol

## Project
Next.js 16 rewrite of ops-dashboard. TypeScript, App Router, static export.
**Repo:** oliver-chase/oliver-app
**Staging:** staging.oliver-app.pages.dev (staging branch)
**Production:** oliver-app.pages.dev (main branch)
**Backend:** Same Supabase as ops-dashboard — tjaowjiccowofzisdfhr.supabase.co

## Branch Workflow

**Default working branch is `staging`. Never commit directly to `main`.**

### "push to staging"
```bash
git add <epic-owned paths>
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
- Next.js 16 App Router, TypeScript, static export (`output: 'export'` in next.config.ts)
- Build output: `out/` — CF Pages build command: `npm run build`, output dir: `out`
- Supabase client: `src/lib/supabase.ts` (browser-only, NEXT_PUBLIC_ env vars)
- Types: `src/types/index.ts` — all table schemas
- Data hook: `src/hooks/useAccountsData.ts`

## Key rules
- All work starts on `staging` branch — verify with `git branch --show-current`
- Run local QA gates (`typecheck`, `lint`, `build`, relevant tests) before push
- Same design system as ops-dashboard: tokens.css, components*.css, accounts.css — no new CSS values
- No nested template literals
- TypeScript strict — no `any` unless unavoidable

## Commit Rules
- Do not auto-commit after every change.
- Only commit when explicitly asked, or when a named milestone is complete.
- When committing, group all related changes into a single commit with a message matching the active milestone name.
- Never create more than one commit per working session unless explicitly told to start a new milestone.
- Commit grouping standard (required): one owning epic per commit (full epic milestone or incremental slice inside an existing epic), with Ticket IDs listed in commit body.
- Commit format standard (required): `<type>(epic-<name>): <summary>` plus `Tickets:` and `Scope:` lines.
- QA evidence standard (required): document `typecheck`, `lint`, `build`, and test gate status in PR/release notes.
- Squash standard (required): run `npm run check-epic-size` before push/PR; if thresholds are exceeded, squash into clean epic milestone commit(s).
- Assessment scope rule (required): findings discovered during audits can be documented and intentionally left out of the current commit if they may be active in another terminal/session.
