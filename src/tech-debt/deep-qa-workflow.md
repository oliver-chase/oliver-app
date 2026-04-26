# Deep QA Workflow

Use this when a request asks for a broad, strong, or codebase-wide QA pass.
The goal is repeatable coverage without relying on session memory.

## 1. Local static gates

Run these first:

```bash
npm run typecheck
npm run lint
npm run build
```

These cover:

- TypeScript regressions
- token drift via `scripts/check-tokens.mjs`
- static export/build breakage

If any of these fail, stop and fix them before browser work.

## 2. Local browser smoke

Start a local app instance and run the committed Playwright suite:

```bash
npm run test:smoke
```

Current suite location:

- `tests/e2e/frontend-smoke.spec.ts`
- `playwright.config.ts` (self-managed local server + E2E auth bypass env)

Current route coverage:

- `/`
- `/accounts`
- `/hr`
- `/sdr`
- `/crm`
- `/admin`
- `/design-system`

Current interaction coverage:

- Hub card and admin-link navigation
- Major route shell render
- Accounts shell controls and detail section navigation
- HR sidebar, modal/search, and settings tab behavior
- SDR tab switching and refresh control
- Admin tab switching and design-system link
- Design-system copy controls, picker, and modal behavior

Artifacts from local browser runs are transient and must not be committed:

- `test-results/`
- `playwright-report/`

## 3. Story and audit review

After the local gates pass, review the living docs before calling the pass complete:

- `.github/user-stories/_index.md`
- `.github/user-stories/oliver-app/audits/_coverage-audit.md`
- `.github/user-stories/oliver-app/audits/_traceability-matrix.md`
- `.github/user-stories/oliver-app/audits/_verification-audit.md`
- `src/tech-debt/STATE.md`
- `src/tech-debt/locked.md`

Check that:

- newly added work has a story or an intentional audit note
- verification claims match the actual test suite
- locked invariants still match the code

## 4. Minimum manual checks

Run targeted manual checks for surfaces that are high-risk or environment-backed.

Always verify:

- top-level navigation and page headings
- shell consistency below the topbar
- primary action targets
- custom dropdowns and popovers
- modals open, focus, confirm, and dismiss behavior
- editable fields and blur-save flows
- pills, badges, and placeholder text
- copy-to-clipboard controls
- loading, empty, error, and retry states

## 5. Live-environment validation

Some behaviors cannot be proved locally with the QA bypass or static review.
Validate these on staging or another environment with real backing services:

- Azure login and redirect/session behavior
- `/api/users` resolution with seeded `app_users`
- real admin visibility and restricted module visibility
- chat history persistence through `/api/chat-messages`
- Supabase-backed writes that depend on deployed schema or service-role access
- AI-backed parse/chat flows that require live provider keys

## 6. Close-out contract

A deep QA pass is only complete when the result names:

- commands run
- whether Playwright passed
- any manual-only or env-backed gaps left open
- any generated artifacts intentionally left uncommitted

## 7. Staging-to-main promotion gate

Before any staging-to-main promotion for cross-module work, complete:

- `.github/user-stories/oliver-app/backlog/outstanding-build-priorities-2026-04-25/cross-module-journey-matrix-US-O33.md`
- `.github/user-stories/oliver-app/backlog/outstanding-build-priorities-2026-04-25/staging-to-main-release-checklist-US-O33.md`

Promotion is blocked unless every required command in that checklist is green and results are logged in `src/tech-debt/release-traceability.md`.

## 8. Startup performance gate

For Hub startup and permission warm-path regressions, include the startup budget smoke gate:

- `npx playwright test tests/e2e/frontend-smoke.spec.ts --grep "hub startup telemetry records budgeted auth and permission warm-path timings"`

Budget source and metric definitions:

- `.github/user-stories/oliver-app/backlog/outstanding-build-priorities-2026-04-25/startup-budget-and-gate-US-O32.md`
