# Oliver App Outstanding WIP Tracker (2026-04-24)

## Branch Hygiene

- `staging`, `main`, `origin/staging`, and `origin/main` are aligned at `2dc0611`.
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
- Current state: completed and committed in prior staging/main alignment pass.
- File scope currently in worktree:
  - `src/components/slides/import-validation.ts`
  - `src/components/slides/persistence-types.ts`
  - `src/components/slides/html-export.ts`
  - `src/components/slides/types.ts`
  - `src/lib/slides.ts`

### epic-slides-reliability-guardrails

- Stories targeted:
  - `US-SLD-037` unsaved change guardrails for workspace navigation
  - `US-SLD-038` scoped draft recovery lifecycle for unsaved edits
  - `US-SLD-039` autosave retry queue and backoff controls
- Current state: `Assigned` with implementation present in current worktree.
- File scope currently in worktree:
  - `src/app/slides/page.tsx`
  - `tests/e2e/slides-regression.spec.ts`
  - `.github/user-stories/oliver-app/backlog/slides-module-ux-be-backlog-2026-04-24/US-SLD-037-*.md`
  - `.github/user-stories/oliver-app/backlog/slides-module-ux-be-backlog-2026-04-24/US-SLD-038-*.md`

### epic-account-export-contracts

- Stories targeted:
  - `US-OLV-040` export account data
  - `US-OLV-041` choose export note scope
- Current state: completed and committed in prior staging/main alignment pass.
- File scope currently in worktree:
  - `src/app/accounts/flows.ts`
  - `src/components/accounts/ExportPanel.tsx`
  - `src/lib/accounts-export.ts`

### epic-gap-reconciliation-and-traceability

- Stories assigned (retroactive ticketing):
  - `US-OLV-127` retroactively map SDR approval hardening and slides alignment
  - `US-OLV-128` retroactively map slides ops, account export, and chatbot QA closure
- Retroactive commit mapping:
  - `83e37c7` -> `US-OLV-127`
  - `eb21740` -> `US-OLV-128`
- Current state: `Assigned` and indexed for GitHub issue conversion.

## Next Commit Plan

1. Promote retroactive stories `US-OLV-127` and `US-OLV-128` to `Verified: true` after any additional environment-backed replay checks.
2. Keep commit format:
   - `<type>(epic-<name>): <summary>`
   - `Tickets: <ID, ID, ...>`
   - `Scope: <modules/files>`
