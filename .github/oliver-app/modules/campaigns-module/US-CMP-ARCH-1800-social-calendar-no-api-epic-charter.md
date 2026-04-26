---
ID: US-CMP-ARCH-1800
Title: Social calendar no-API epic charter
Status: Not Started
Verified: false
Backdated: 2026-04-26
Ticket: CMP-ARCH-1800
Epic: CMP-E12: Social Calendar Intelligence Automation (No-API / No-Claude-Dependency)
---

As a module owner
I want a formal epic charter for no-API social calendar intelligence
So implementation can be sequenced, estimated, and executed with explicit boundaries

Acceptance Criteria:
- [ ] Epic explicitly states that execution does not require Claude Code skills, slash commands, or Claude-specific installation/runtime paths.
- [ ] Epic explicitly states that execution does not require private social platform APIs or OAuth integrations in baseline scope.
- [ ] Epic defines in-scope stories and dependency order: `1801 -> 1802 -> 1803 -> 1804 -> 1805 -> 1806`.
- [ ] Epic defines out-of-scope items: direct social publishing, private analytics ingestion, ad-account APIs, and paid third-party orchestration tools.
- [ ] Epic defines required persistence surfaces in Oliver stack (Supabase tables, artifact storage, run logs, and review status tracking).
- [ ] Epic defines required runtime surfaces in Oliver stack (Cloudflare Functions endpoints + scheduled jobs + campaign UI entrypoints).
- [ ] Epic defines acceptance evidence package requirements (contracts, seeded e2e, smoke coverage, and runbook docs).
- [ ] Epic defines risk register items: source quality drift, scraping fragility, legal/robots constraints, and deterministic regeneration drift.
- [ ] Epic defines release gates and rollback strategy for introducing automated planning outputs to production users.
- [ ] Epic links each story to owner role (`ARCH/BE/FE/QA`) and required integration tests before promotion.

Execution Notes (Accuracy / Executable Scope):
- Use existing campaign stack conventions: `functions/api/*`, `src/lib/*`, `src/app/campaigns/*`, `supabase/migrations/*`.
- Reuse campaign mutation audit and permission patterns from current `CMP-BE-*` story implementations.
- Deliver all E12 artifacts with deterministic run ids and reproducible input snapshots.
