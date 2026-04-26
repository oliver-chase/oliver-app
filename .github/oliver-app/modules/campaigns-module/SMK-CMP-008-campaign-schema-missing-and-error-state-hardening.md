---
ID: SMK-CMP-008
Title: Harden Campaign Schema-Missing and Top-Right Error State Handling
Status: Not Started
Verified: false
Backdated: 2026-04-26
---

As a campaigns module operator
I want schema-missing and top-right error states to be accurate, actionable, and non-blocking where possible
So the module does not degrade into misleading or persistent failure mode during normal workflows

Source Signal:
- User-reported runtime state on 2026-04-26:
  - Banner: `Campaign schema is not migrated yet. Run supabase/migrations/014_campaign_content_posting_foundation.sql.`
  - Concurrent top-right error state in campaigns shell.

Scope Notes:
- Distinguish true schema-missing conditions from transient fetch/permission/runtime errors.
- Ensure user-facing errors point to correct remediation path.
- Prevent persistent global error state when data can still load and operations can proceed safely.

Acceptance Criteria:
- [ ] Schema-missing banner appears only for verified migration/schema-cache absence conditions.
- [ ] Top-right error state message is specific, deduplicated, and mapped to actionable remediation.
- [ ] When schema is healthy, campaigns module loads seeded/live data without schema-missing fallback.
- [ ] Error-state handling no longer causes false `Showing 0 of 0` style operational regressions in campaign flows.
- [ ] E2E coverage includes explicit checks for schema-missing vs non-schema failure paths.

QA / Evidence:
- [ ] Attach reproduction log showing prior failure mode and post-fix passing behavior.
- [ ] Attach campaign module run output proving no false schema-missing state in healthy environments.
- [ ] Capture at least one negative test where schema is truly missing and banner remains correct.

