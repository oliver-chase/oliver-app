---
ID: SMK-SLD-002
Title: Stabilize Slides Coordinate Normalization Expectations
Status: Not Started
Verified: false
Backdated: 2026-04-26
---

As a slides parser owner
I want coordinate normalization outputs to be deterministic and documented
So expected-value smoke assertions match intentional transform logic

Source Failure:
- `tests/e2e/frontend-smoke.spec.ts:1122`
- Scenario: `US-SLD-003 slides import normalizes coordinates and applies simple translate offsets`

Error Context:
- `test-results/frontend-smoke-frontend-sm-d2b7e-es-simple-translate-offsets-chromium/error-context.md`

Repro Command:
```bash
npx playwright test tests/e2e/frontend-smoke.spec.ts -g "US-SLD-003 slides import normalizes coordinates and applies simple translate offsets"
```

Acceptance Criteria:
- [ ] Coordinate transform contract is explicit (including offset/rounding behavior).
- [ ] Expected x/y values in smoke test match intentional parser output.
- [ ] Focused repro command passes.

QA / Evidence:
- [ ] Attach rerun log path for passing repro.
- [ ] Attach updated error-context artifact or note `no error-context generated` on pass.

