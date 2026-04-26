# US-O33 Staging-to-Main Release Checklist (Required)

Promotion rule: staging-to-main promotion is blocked unless this checklist is complete and the matrix run is green.

Reference matrix:
- `cross-module-journey-matrix-US-O33.md`

## Required Gates

1. Static quality gates
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`

2. Contract gates
- [ ] `npm run test:contracts`

3. Cross-module journey matrix E2E gates
- [ ] `npx playwright test tests/e2e/frontend-smoke.spec.ts --grep "(hub cards and admin links navigate correctly|major routes render a non-empty shell|admin workspace keeps design-system navigation in the admin sidebar|owner rows are locked in user manager controls|admin user manager surfaces backend failures and recovers after refresh|design system token edits persist across reload through backend contract|design system token save failures surface errors and cancel restores original value|non-admin user cannot access admin and does not see admin links|non-admin chatbot prompts for admin scope are blocked without route changes|chatbot hides dormant module routing prompts when module is not enabled|US-SLD-029 slides chatbot commands cover parse, save, export, and workspace navigation intents)"`
- [ ] `npx playwright test tests/e2e/slides-regression.spec.ts --grep "(US-SLD-039 autosave queues retry with backoff after API failure and recovers on retry|US-O31 autosave enters degraded local-draft mode after retry budget is exhausted)"`

4. Traceability and signoff
- [ ] Record command outcomes in `src/tech-debt/release-traceability.md` with date, branch, and commit hash.
- [ ] Confirm no unresolved P0 journey-matrix failures.
- [ ] Confirm affected story statuses and `Verified` fields are updated.

## Evidence Block (fill per release)

- Date (ET):
- Branch:
- Commit range:
- Typecheck/lint/build result:
- Contracts result:
- Matrix E2E result:
- Exceptions/Risks accepted:
- Approver:
