---
ID: SMK-SLD-001
Title: Align Slides Unsupported-Unit Warning Contract
Status: Not Started
Verified: false
Backdated: 2026-04-26
---

As a slides import owner
I want unsupported-unit warnings to follow a deterministic contract
So parse-warning assertions stay aligned with parser behavior

Source Failure:
- `tests/e2e/frontend-smoke.spec.ts:1095`
- Scenario: `US-SLD-003 slides import sanitizes markup and warns on unsupported units/transforms`

Error Context:
- `test-results/frontend-smoke-frontend-sm-0cfdd-nsupported-units-transforms-chromium/error-context.md`

Repro Command:
```bash
npx playwright test tests/e2e/frontend-smoke.spec.ts -g "US-SLD-003 slides import sanitizes markup and warns on unsupported units/transforms"
```

Acceptance Criteria:
- [ ] Unsupported unit warning copy/shape is explicit and reflected in test assertions.
- [ ] Unsupported transform warning remains visible and asserted.
- [ ] Focused repro command passes.

QA / Evidence:
- [ ] Attach rerun log path for passing repro.
- [ ] Attach updated error-context artifact or note `no error-context generated` on pass.

