---
ID: US-CMP-ARCH-1801
Title: No-Claude-skill local social workflow runner
Status: Not Started
Verified: false
Backdated: 2026-04-26
Ticket: CMP-ARCH-1801
Epic: CMP-E12: Social Calendar Intelligence Automation (No-API / No-Claude-Dependency)
---

As a campaign operator
I want calendar, audit, competitor, and full-suite workflows to run inside Oliver App without Claude Code skills
So social planning is executable from our codebase and deployment stack only

Acceptance Criteria:
- [ ] A first-party workflow runner exists with four runnable modes: `calendar`, `audit`, `competitor`, `suite`.
- [ ] Workflows are triggerable from campaign module UI and from a deterministic server-side job entrypoint.
- [ ] No dependency on `SKILL.md`, slash commands, or any Claude-specific runtime/installation path is required for execution.
- [ ] Runner contracts define strict request/response schemas, including validation errors with actionable messages.
- [ ] Each run persists immutable execution metadata: run id, mode, actor, input payload hash, start/end timestamps, status, and artifact references.
- [ ] Re-running the same input in `dry_run` mode produces a deterministic execution plan without writing artifacts.
- [ ] Runner supports `abort` and `resume` semantics with safe state checkpoints between major phases.
- [ ] Failure handling classifies errors (`input`, `network`, `parse`, `pipeline`, `storage`) and maps each class to retry policy.
- [ ] Concurrency guard prevents duplicate live runs for the same brand/month/mode key while allowing independent brands in parallel.
- [ ] Security model enforces campaign permission checks for read/write operations and logs all unauthorized attempts.

Executable Delivery Requirements:
- [ ] Add persisted run model migration covering `run_id`, `mode`, `input_snapshot_hash`, `status`, `phase`, `error_class`, and artifact pointers.
- [ ] Add server endpoint contract under `functions/api` for starting, polling, aborting, and resuming runs.
- [ ] Add typed client wrapper in `src/lib` and UI trigger surface under `src/app/campaigns`.
- [ ] Add contract tests covering all modes and error classes plus authorization negative paths.
- [ ] Add seeded e2e scenario proving calendar run can be started, polled, and completed without Claude runtime dependencies.
