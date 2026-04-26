# Campaigns Module Backlog (2026-04-26)

Scope: all module stories for campaigns including execution, parity, rollout, and QA readiness.

## Epic Tracks in This Module

- `CMP-E0` Foundation and access
- `CMP-E1` Campaign management and cadence workflows
- `CMP-E2` Drafting and asseting quality
- `CMP-E3` Review queue and approval integrity
- `CMP-E4` Library/search/discovery
- `CMP-E5` Claiming, scheduling, and posting execution
- `CMP-E6` Reminders and missed-post operations
- `CMP-E7` Reporting and export
- `CMP-E8` Chatbot and guided workflows
- `CMP-E9` Auditability, validation, and recovery
- `CMP-E10` Scale/performance hardening
- `CMP-E11` QA, rollout, and DoD
- `CMP-E12` Social calendar intelligence automation (no API / no Claude dependency)
- `CMP-E13` Social automation orchestration, governance, and evidence
- `CMP-PAR-E1` Workspace coherence
- `CMP-PAR-E2` Workflow-state parity and review durability
- `CMP-PAR-E3` Scheduling/reminder operational backbone
- `CMP-PAR-E4` Permission and authorization matrix
- `CMP-PAR-E5` Reporting clarity
- `CMP-PAR-E6` E2E certification and legacy cutover

## Prioritization Signals

- P0: state durability, scheduling/reminders, permission enforcement, and key parity deltas
- P1: reporting clarity, rollout confidence, mobile hardening

## Canonical index points

- PRD execution map: `campaigns-module-user-story-map.md`
- E12 epic charter: `US-CMP-ARCH-1800-social-calendar-no-api-epic-charter.md`
- E13 epic charter: `US-CMP-ARCH-1810-social-automation-governance-epic-charter.md`
- QA and rollout evidence: `US-CMP-QA-1111-rollout-controls-and-migration-safety.md`,
  `US-CMP-QA-1112-mvp-dod-verification-checklist.md`, `US-CMP-QA-1113-ics-import-platform-verification.md`,
  `US-CMP-QA-1114-staging-signoff-evidence-package.md`, `US-CMP-QA-1115-tokenized-ui-hardening-and-mobile-verification.md`
- Parity and readiness package: `US-CMP-QA-1701-end-to-end-certification-for-spec-critical-campaign-journeys.md`
  and `US-CMP-ARCH-1702-legacy-single-page-mode-deprecation-and-route-cutover.md`

## Source references

- `docs/modules/campaigns.md`
- `docs/modules/campaigns-gap-analysis-2026-04-25.md`
- `campaigns-module-prd.md`

## E12/E13 Story Index (No-API Social Automation)

- `US-CMP-ARCH-1800-social-calendar-no-api-epic-charter.md`
- `US-CMP-ARCH-1801-no-claude-skill-local-social-workflow-runner.md`
- `US-CMP-BE-1802-public-web-research-pipeline-without-platform-apis.md`
- `US-CMP-FE-1803-narrative-brief-approval-gate-and-planning-surface.md`
- `US-CMP-BE-1804-platform-rules-engine-and-content-compliance.md`
- `US-CMP-BE-1805-calendar-artifact-builder-xlsx-and-json-bundle.md`
- `US-CMP-BE-1806-brand-audit-and-competitor-gap-engine.md`
- `US-CMP-ARCH-1810-social-automation-governance-epic-charter.md`
- `US-CMP-BE-1811-scheduled-orchestration-idempotency-and-retry-policies.md`
- `US-CMP-QA-1812-source-traceability-governance-and-evidence-gates.md`

## Open stabilization tickets (2026-04-26)

- `SMK-CMP-007` Sidebar design-system parity
  - `.github/oliver-app/modules/campaigns-module/SMK-CMP-007-campaign-sidebar-design-system-parity.md`
- `SMK-CMP-008` Schema-missing + top-right error-state hardening
  - `.github/oliver-app/modules/campaigns-module/SMK-CMP-008-campaign-schema-missing-and-error-state-hardening.md`

## Mautic-Informed Expansion Backlog (2026-04-26)

Design intent: maximize campaign visuals, data intelligence, automations, and decision information using existing stack only (`Next.js static export + Supabase + Cloudflare Pages Functions`) while using Mautic capabilities as product reference patterns.

Reference signals from Mautic:
- Campaign builder actions/decisions/conditions model
- Segment-driven campaign entry and dynamic membership
- Point actions and point-trigger automation
- Focus-item style on-site engagement and conversion tracking
- Campaign/report data-source model and activity-centric analytics

Mautic source anchors:
- `https://github.com/mautic/mautic` (core reference)
- `https://docs.mautic.org/en/7.1/campaigns/campaign_builder.html`
- `https://docs.mautic.org/en/7.0/segments/manage_segments.html`
- `https://docs.mautic.org/en/5.2/points/points.html`
- `https://docs.mautic.org/en/6.0/channels/focus_items.html`
- `https://docs.mautic.org/en/6.0/reports/reports.html`

Global acceptance guardrails for all stories in Themes `CMP-T14` to `CMP-T17`:
1. Keep architecture on existing runtime only: `Next.js static export + Supabase + Cloudflare Pages Functions`; no new persistent runtime dependencies.
2. Enforce capability and permission checks in both UI and server contracts; UI gating alone is insufficient.
3. All writes must be auditable with actor, timestamp, and request correlation id.
4. All critical flows require mobile and desktop responsive behavior with no horizontal overflow in module shell.
5. Every async surface must define loading, empty, error, and recovery states with deterministic operator guidance.
6. Reported metrics and recommendation outputs must expose freshness timestamps and source coverage/confidence metadata.

### Theme CMP-T14: Visual Campaign Orchestration and Operator Clarity

#### Epic CMP-E14A: Journey Builder and Timeline Views

**Story US-CMP-FE-1901: Build campaign journey canvas with action/decision/condition nodes**
As an admin, I want a visual journey canvas so I can understand and edit campaign automation flow without reading raw rules.

Acceptance Criteria:
1. A journey canvas is available from campaign detail for users with campaign-admin capability.
2. Canvas supports at least three node types: `action`, `decision`, `condition`.
3. Node edits open existing app modal patterns and persist to Supabase through typed APIs.
4. Validation blocks save when graph has dangling nodes, cycles in prohibited branches, or missing required node params.
5. A read-only mode is shown for users lacking edit permission.
6. Every publish action writes an activity log event with before/after graph version ids.
7. Rendering and editing works on desktop and mobile breakpoints used by existing campaign routes.

**Story US-CMP-FE-1902: Add campaign execution timeline with branch outcomes**
As an operator, I want a timeline of automation decisions and outcomes so I can debug why contacts moved through a path.

Acceptance Criteria:
1. Timeline shows ordered entries for each executed node with timestamp, actor type (`system` or user), and outcome.
2. Decision entries show positive/negative branch outcome labels.
3. Timeline supports filters by date range, branch outcome, and node type.
4. Clicking an entry highlights corresponding node on the journey canvas.
5. Timeline queries use paginated backend reads and keep p95 response <= 400ms for 30-day windows.
6. Timeline is exportable to JSON and CSV through existing report-export infrastructure.

#### Epic CMP-E14B: Visual Planning Surfaces and Focus Operations

**Story US-CMP-FE-1903: Add campaign planning board with objective and channel blocks**
As a campaign manager, I want a planning board view so I can align objective, audience, channels, and offers before execution.

Acceptance Criteria:
1. Planning board includes cards for objective, target audience, channel mix, CTA, and success metrics.
2. All cards are tokenized and reuse existing card/chip/button primitives in campaigns styles.
3. Board supports status chips (`draft`, `ready`, `live`, `paused`) and required-field completeness indicators.
4. Missing required fields are surfaced as next actions on overview.
5. Save/reset behaviors follow existing mutation banner and conflict-recovery conventions.
6. Board snapshots are versioned and auditable in activity log.

**Story US-CMP-FE-1904: Implement focus-item workspace for on-site prompts**
As a marketer, I want to define focus prompts (banner/modal/notice/link) so I can run on-site conversion prompts within campaigns.

Acceptance Criteria:
1. Focus-item type supports at minimum `collect_data`, `display_notice`, and `emphasize_link`.
2. Focus-item schedule can be linked to campaign nodes and controlled by active date windows.
3. Embed instructions are generated for existing app/web properties without requiring new runtime services.
4. Focus-item impressions and conversions are tracked via existing event pipeline and visible in reporting.
5. Domain allowlist checks are enforced before enabling a focus item.
6. Mobile preview exists for all focus-item types.

### Theme CMP-T15: Audience Intelligence and Data Enrichment

#### Epic CMP-E15A: Segmentation and Contact Qualification

**Story US-CMP-BE-1910: Add dynamic segment engine for campaign audience entry**
As a campaign owner, I want dynamic segment rules so contacts enter/exit campaigns based on changing attributes and behavior.

Acceptance Criteria:
1. Segment definitions are stored as normalized filter groups (`and`/`or`) with versioning.
2. Supported filter domains include contact profile, engagement events, campaign activity, and UTM metadata.
3. Segment evaluation runs incrementally on schedule through Cloudflare job orchestration and is idempotent.
4. Contact add/remove deltas are written atomically with audit rows.
5. Segment build status includes `building`, `ready`, `error` with operator-visible diagnostics.
6. Evaluation failures do not block unrelated campaign jobs and are retryable with dedupe keys.

**Story US-CMP-FE-1911: Build segment builder UI with rule groups and live counts**
As an operator, I want a segment builder UI with live size estimates so I can confidently target audiences before launch.

Acceptance Criteria:
1. UI supports nested rule groups with AND/OR logic and field/operator/value controls.
2. Live estimate requests are debounced and served by backend explain-safe query layer.
3. Estimated audience count displays freshness timestamp and confidence state (`estimated` or `exact`).
4. Segment save requires name, owner scope, and at least one valid rule.
5. Empty and error states guide users to fix invalid filters.
6. Story includes e2e coverage for create/edit/clone/archive segment flows.

#### Epic CMP-E15B: Scoring, Triggers, and Enrichment

**Story US-CMP-BE-1912: Introduce engagement scoring actions and trigger thresholds**
As a lifecycle marketer, I want point-based scoring and thresholds so high-intent contacts can auto-route to the right campaign actions.

Acceptance Criteria:
1. Scoring model supports positive and negative point actions mapped to tracked events.
2. Scores support global and grouped contexts.
3. Threshold triggers can execute campaign actions, segment changes, or ownership routing.
4. Score updates are idempotent and prevent duplicate event processing.
5. Score-change history is queryable with actor/event/source metadata.
6. Backfill job can recompute scores for a date window without corrupting current scores.

**Story US-CMP-BE-1913: Add enrichment ingestion contract for external contact/context data**
As an operations admin, I want a controlled enrichment pipeline so campaign decisions can use fresher account and contact context.

Acceptance Criteria:
1. Enrichment endpoint accepts signed payloads and validates schema versions.
2. Incoming data maps to allowed fields only and enforces denylist for sensitive writes.
3. Upserts are transactional and produce per-field change audit metadata.
4. Failed records are dead-lettered with retry controls and operator visibility.
5. Enrichment writes can trigger segment/scoring recalculation selectively.
6. Pipeline includes contract tests for malformed payloads, duplicates, and out-of-order updates.

### Theme CMP-T16: Automation, Governance, and Reliability

#### Epic CMP-E16A: Rules Engine and Runbook-Grade Automation

**Story US-CMP-BE-1920: Build campaign automation rules engine with deterministic evaluation**
As a system owner, I want rule-based automation execution so campaign actions fire consistently and are easy to audit.

Acceptance Criteria:
1. Rules support triggers on schedule, event, and threshold transitions.
2. Rule evaluator persists deterministic execution records with rule id, version, and evaluated inputs hash.
3. Engine enforces per-rule cooldown and global concurrency limits to prevent thrashing.
4. All actions run through existing capability and permission matrix.
5. Failed actions capture classified error code and retry state.
6. Engine exposes dry-run mode that returns predicted actions without writes.

**Story US-CMP-QA-1921: Add automation replay and incident recovery runbook**
As on-call support, I want replayable automation windows so we can recover safely after outages or bad deploys.

Acceptance Criteria:
1. Admins can select a time window and replay eligible missed executions in dry-run or live mode.
2. Replay is idempotent and skips already-successful execution ids.
3. Replay UI shows per-rule impact estimate before execution.
4. Recovery actions are logged with initiator, reason, and scope.
5. Runbook includes rollback steps and kill-switch controls already used in module rollout docs.
6. Integration tests cover replay conflicts, partial failures, and kill-switch invocation.

#### Epic CMP-E16B: Eventing, Webhooks, and Policy Compliance

**Story US-CMP-BE-1922: Create outbound webhook/event bus for campaign lifecycle changes**
As an integration engineer, I want structured webhooks for campaign events so downstream systems stay in sync.

Acceptance Criteria:
1. Event catalog includes campaign, content, review, scheduling, reminder, and export lifecycle events.
2. Payload schema versions are explicit and backward-compatible for at least one prior minor version.
3. Delivery supports retry with exponential backoff and dead-letter queue.
4. Signing secret validation and replay-window protection are enforced.
5. Webhook delivery logs are searchable by event id, endpoint, and status.
6. Operators can replay single events to one endpoint without replaying the full queue.

**Story US-CMP-BE-1923: Add policy/compliance checks for automation actions**
As a compliance lead, I want pre-send and pre-publish policy checks so blocked content/actions never execute.

Acceptance Criteria:
1. Policy engine evaluates channel-specific rules before publish/schedule/send transitions.
2. Violations return structured reasons and actionable remediation hints.
3. Policy checks support environment-level toggles and severity levels (`warn`, `block`).
4. Every policy decision is logged with policy set version and evidence snapshot.
5. Bulk actions surface row-level pass/fail policy outcomes.
6. E2E tests cover blocked publish, warning-only publish, and admin override with mandatory reason.

### Theme CMP-T17: Decision Intelligence, Reporting, and Recommendations

#### Epic CMP-E17A: Multi-Dimensional Reporting

**Story US-CMP-BE-1930: Expand reporting model for campaign journey analytics**
As a stakeholder, I want campaign analytics by journey node and segment so I can see where outcomes improve or decay.

Acceptance Criteria:
1. Reporting schema adds rollups by campaign, segment, node type, branch outcome, and channel.
2. Time-series aggregations are available for day/week/month with UTC storage and local rendering.
3. Report APIs support filter combinations without full workspace reload.
4. Export jobs include metadata manifest describing filters and generation timestamp.
5. Query plans for top report endpoints meet documented p95 limits under seeded load.
6. Contract tests validate numeric consistency between rollup cards and detailed breakdowns.

**Story US-CMP-FE-1931: Build campaign intelligence dashboard with anomaly flags**
As a campaign lead, I want an intelligence dashboard with trend and anomaly indicators so I can intervene quickly.

Acceptance Criteria:
1. Dashboard includes trend cards for conversion, review latency, schedule adherence, and missed posts.
2. Anomaly detection surfaces significant deviations against trailing baseline windows.
3. Every anomaly card includes drill-down link to the filtered operational view.
4. Insight cards include confidence/coverage indicators and last-refresh timestamp.
5. Dashboard supports sharing/export via existing report export pipeline.
6. UI remains usable and performant on mobile with stacked card layout.

#### Epic CMP-E17B: Recommendations and Operator Guidance

**Story US-CMP-FE-1932: Add next-best-action recommendations in campaign overview**
As an operator, I want system-generated next actions so I can prioritize the highest-impact fixes first.

Acceptance Criteria:
1. Recommendation feed ranks actions by expected impact and urgency.
2. Each recommendation links directly to the exact queue/filter/context required to execute it.
3. Dismiss/snooze actions are available and logged for later analysis.
4. Recommendations degrade gracefully when data confidence is low.
5. Feed updates without hard reload after underlying state changes.
6. Feature has guarded rollout flag and can be disabled per environment.

**Story US-CMP-QA-1933: Establish evidence gates for recommendation correctness**
As a QA owner, I want deterministic test gates for recommendation logic so prioritization quality does not regress.

Acceptance Criteria:
1. Recommendation engine has fixture-driven unit tests for ranking and tie-breaking.
2. Integration tests verify recommendation generation under sparse, noisy, and contradictory data.
3. E2E tests assert recommendation deep-link accuracy and action completion loops.
4. Evidence package records false-positive and false-negative checks before release.
5. Rollout checklist requires signoff from campaign ops and QA.
6. Regression suite is wired into existing campaign staging signoff process.
