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

## Module Docs (Required)
- Global module map: `docs/MODULE_CONTEXT.md`
- Agent/module workflow: `docs/MODULE_INSTRUCTIONS.md`
- Per-module breakouts: `docs/modules/README.md` and `docs/modules/*.md`
- Source-of-truth module registry: `src/modules/registry.ts`
- Source-of-truth access gate behavior: `src/modules/use-module-access.ts`

When a module changes (route, permission, visibility, commands, flows, or data contracts), update the corresponding `docs/modules/<module>.md` file in the same change.

## Current Module Surfaces (2026-04-25)
- Hub: `/` (entry/navigation only)
- Accounts: `/accounts` (`accounts`)
- HR: `/hr` (`hr`)
- SDR: `/sdr` (`sdr`)
- Slides: `/slides` (`slides`)
- Campaigns: `/campaigns` (`campaigns`)
- Reviews: `/reviews` (`reviews`, coming-soon/admin-only while flagged)
- CRM: `/crm` (`crm`, disabled by default and hidden from hub)
- Admin workspace: `/admin` (admin role)
- Design System workspace: `/design-system` (admin role)

## Key rules
- All work starts on `staging` branch — verify with `git branch --show-current`
- Run local QA gates (`typecheck`, `lint`, `build`, relevant tests) before push
- Same design system as ops-dashboard: tokens.css, components*.css, accounts.css — no new CSS values
- No nested template literals
- TypeScript strict — no `any` unless unavoidable
- Intake gate: every meaningful request is represented as a story before work starts:
  - define `Epic`, `Status`, and explicit Acceptance Criteria
  - run a quick prioritization check against active backlog entries
  - add to active backlog with default priority when not explicitly prioritized
  - do not execute without that backlog/story record
- Backlog lifecycle is mandatory before closure: use the global [story-lifecycle-gate](/Users/oliver/.codex/skills/story-lifecycle-gate/SKILL.md) for all docs reviews so in-progress stories with complete AC + evidence are moved to `Done`, marked `Verified`, and removed from active planning queues.

Documentation and module backlog rules:
- If a requirements doc includes executable user stories, convert to module backlog source and keep PRD as pointer only.
- Keep module work separated by backlog folder under `/.github/oliver-app/modules/*` with its own README.
- Avoid duplicate story text across modules and planning files; cross-link to canonical files instead.

Session startup reminder:
- Before any execution decision, apply the [story-lifecycle-gate](/Users/oliver/.codex/skills/story-lifecycle-gate/SKILL.md): backlog-first intake, test/evidence planning, no duplicated PRD story maps, and module-specific backlog discipline.

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
