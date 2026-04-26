---
ID: US-CMP-BE-1811
Title: Scheduled orchestration, idempotency, and retry policies
Status: Not Started
Verified: false
Backdated: 2026-04-26
Ticket: CMP-BE-1811
Epic: CMP-E13: Social Automation Orchestration and Governance
---

As an operations owner
I want reliable scheduled automation with idempotent execution controls
So recurring social planning runs can execute safely without duplicate outputs

Acceptance Criteria:
- [ ] Scheduler supports weekly research refresh and monthly calendar generation windows configurable per brand.
- [ ] Each scheduled run uses an idempotency key composed of brand, mode, month, and input snapshot hash.
- [ ] Duplicate in-flight executions with matching key are prevented and logged as deduped events.
- [ ] Retry policy is class-based with capped attempts and exponential backoff for transient failures.
- [ ] Permanent failures route to dead-letter records with full context and replay controls.
- [ ] Operator dashboard shows queued, running, succeeded, failed, and deduped counts by mode.
- [ ] Manual replay requires explicit operator confirmation and links to originating failed run.
- [ ] Run cancellation is cooperative and leaves state in a recoverable checkpointed status.
- [ ] Scheduler clock behavior is timezone-explicit and uses deterministic cutoff rules.
- [ ] End-to-end run audit trail is exportable for incident review and compliance evidence.

Executable Delivery Requirements:
- [ ] Implement scheduler configuration model per brand with cron spec, timezone, mode, and payload template.
- [ ] Implement idempotency persistence keyed by brand/mode/month/input hash and enforce uniqueness at DB level.
- [ ] Implement retry + dead-letter handlers with replay endpoint and operator authorization checks.
- [ ] Add operational dashboard queries for queue state and error-class distributions.
- [ ] Add integration tests for dedupe, retry exhaustion, dead-letter replay, and cancellation checkpoints.
