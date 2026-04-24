# Oliver App Outstanding WIP Tracker (2026-04-24)

## Branch Hygiene

- `staging`, `main`, `origin/staging`, and `origin/main` are aligned at `83e37c7`.
- Release rule in effect: push to `staging` does not merge to `main` unless explicitly requested.

## QA Status

- `npm run typecheck`: pass (2026-04-24)
- `npm run lint`: pass (2026-04-24)
- `npm run build`: pass (2026-04-24)

## Outstanding Epic Grouping

### epic-slides-platform-hardening

- Stories targeted:
  - `US-SLD-010` import preflight validation and guardrails
  - `US-SLD-030` slide and template data model with RLS
  - `US-SLD-031` save API and autosave state contract
  - `US-SLD-033` HTML and PDF export service contract
- Current state: in progress, not commit-ready.
- File scope currently in worktree:
  - `src/components/slides/import-validation.ts`
  - `src/components/slides/persistence-types.ts`
  - `src/components/slides/html-export.ts`
  - `src/components/slides/types.ts`
  - `src/lib/slides.ts`

### epic-account-export-contracts

- Stories targeted:
  - `US-OLV-040` export account data
  - `US-OLV-041` choose export note scope
- Current state: implementation draft present, not yet tied to explicit QA + story verification update.
- File scope currently in worktree:
  - `src/app/accounts/flows.ts`
  - `src/components/accounts/ExportPanel.tsx`
  - `src/lib/accounts-export.ts`

## Next Commit Plan

1. Commit `epic-slides-platform-hardening` after adding story verification evidence and export/import regression checks.
2. Commit `epic-account-export-contracts` after wiring tests or explicit contract checks for export output shape and note mode handling.
3. Keep commit format:
   - `<type>(epic-<name>): <summary>`
   - `Tickets: <ID, ID, ...>`
   - `Scope: <modules/files>`
