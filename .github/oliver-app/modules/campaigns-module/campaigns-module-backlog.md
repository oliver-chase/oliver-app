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
- Journey coverage matrix: `campaigns-module-journey-coverage-matrix.md`
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
- `SMK-CMP-009` Campaign Playwright webserver stability (mid-suite `ERR_CONNECTION_REFUSED`)
  - Track and fix Next dev-server drop during long campaign suite runs; keep functional assertions separate from harness reliability.

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

Capability parity audit (2026-04-26):
- Journey builder (`actions` / `decisions` / `conditions`): In progress (`CMP-E14A`), delivered baseline editor + timeline; hardening continues.
- Dynamic segment engine + live estimates: In progress (`CMP-E15A`), delivered baseline builder + estimate + clone/archive persistence; scheduled evaluator still pending.
- Point/scoring automation: Planned (`CMP-E15B`), no production scoring engine yet.
- Focus-item engagement controls: In progress (`CMP-E14B`), baseline model and validation present; telemetry confidence surfacing incomplete.
- Campaign report data-source transparency: Partial (`CMP-E17A`, `CMP-T19`), source manifests/provenance not yet complete on all views.
- Chatbot fuzzy campaign workflow routing: Partial (`CMP-E20B`), alias coverage expanding; confidence/ambiguity telemetry gates pending.
- Cross-module design system parity and mapping: Planned/In progress (`CMP-T18`, `CMP-E20C`), mapping/gates defined, migration execution pending.
- Full click-path and mobile certification: In progress (`CMP-E20A`, `CMP-E20C`), matrix and gating stories defined, route-complete cert pending.

Global acceptance guardrails for all stories in Themes `CMP-T14` to `CMP-T17`:
1. Keep architecture on existing runtime only: `Next.js static export + Supabase + Cloudflare Pages Functions`; no new persistent runtime dependencies.
2. Enforce capability and permission checks in both UI and server contracts; UI gating alone is insufficient.
3. All writes must be auditable with actor, timestamp, and request correlation id.
4. All critical flows require mobile and desktop responsive behavior with no horizontal overflow in module shell.
5. Every async surface must define loading, empty, error, and recovery states with deterministic operator guidance.
6. Reported metrics and recommendation outputs must expose freshness timestamps and source coverage/confidence metadata.

Mandatory execution protocol for every story in this section:
1. Perform pre-implementation gap analysis documenting regression risk, schema assumptions, and contract drift risk.
2. Write/refresh detailed user story acceptance criteria before coding when implementation reveals missing behavior.
3. Implement against acceptance criteria only after explicit stack-compatibility check (`Next.js static export + Supabase + Cloudflare Functions`).
4. Add or update tests at all applicable layers:
5. `contract` tests for API payload/permission/error-shape.
6. `e2e` tests for happy path + error path + permission/read-only path.
7. `style/responsive` checks for mobile/desktop no-overflow behavior on changed surfaces.
8. Run full campaign QA sweep before merge: TypeScript check, campaign contracts, campaign e2e suite, campaign smoke lists.
9. Record post-implementation gap analysis with uncovered tech debt and create follow-up backlog stories for every unresolved gap.
10. Do not mark a story complete unless acceptance criteria, evidence, and regression coverage are all satisfied.

Full journey audit baseline (must be kept current while executing stories):
1. Entry points: hub tile, direct route URL, deep links, sidebar route links, chatbot quick chips, chatbot typed-intent routing.
2. Workflow loops: create campaign -> create draft -> submit review -> approve/reject -> claim/unclaim -> schedule -> reminders -> mark posted -> report/export.
3. Automation loops: planning board -> focus items -> segment builder -> journey canvas -> timeline filter -> report drilldown -> recommendation action.
4. Cross-surface transitions: reports to filtered queues, timeline node to canvas highlight, reminders to content detail, chatbot action to exact route/filter context.
5. Error/recovery loops: schema missing, RLS denied, stale-update conflicts, invalid transitions, malformed upload/flow payloads.
6. Mobile loops: sidebar open/close, section switching, modal save/cancel, chatbot trigger + drawer, touch-target path completion without overflow.

### Theme CMP-T14: Visual Campaign Orchestration and Operator Clarity

#### Epic CMP-E14A: Journey Builder and Timeline Views

Execution status (2026-04-26):
- In implementation on current branch, scoped to existing stack only.
- Backend/API delivery: journey timeline query + journey timeline export (`csv`/`json`) through existing `campaign_report_exports` pipeline.
- Frontend delivery: `/campaigns/automation` route with journey canvas editor/read-only mode, publish workflow, timeline filters, node highlight, and export actions.
- QA delivery: contract and e2e coverage extended for automation route and journey timeline API actions.

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

**Story US-CMP-QA-1905: Certify journey/timeline regression and policy safety gates**
As a QA lead, I want explicit regression gates for journey automation so future changes cannot silently break orchestration behavior.

Acceptance Criteria:
1. Test coverage includes admin publish path, non-admin read-only path, graph validation failures, and timeline filtering.
2. API contracts assert permission-denied and malformed-payload envelopes for journey timeline actions.
3. End-to-end tests assert timeline-to-node highlight behavior and route navigation from sidebar and chatbot command.
4. Evidence package records full campaign-suite pass/fail state with concrete command output timestamps.
5. Any unresolved failures must create tracked backlog items before merge.
6. Story cannot close without documented post-implementation gap analysis and follow-up items.

#### Epic CMP-E14B: Visual Planning Surfaces and Focus Operations

Execution status (2026-04-26):
- Delivered on current branch, scoped to existing stack only.
- Frontend delivery: planning board and focus-item workspace added within `/campaigns/automation`.
- Persistence delivery: planning snapshots and focus item artifacts stored in `campaigns.cadence_rule` without dropping journey graph metadata.
- Validation delivery: active focus items require domain allowlist and valid active window ordering.
- QA delivery: e2e coverage added for planning persistence and focus allowlist enforcement, plus targeted campaigns regression slice (18 tests) passing.

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

**Story US-CMP-ARCH-1906: Harden planning/focus schema contracts and rollback safety**
As a platform owner, I want deterministic schema/version contracts for planning-board and focus-item payloads so upgrades do not cause data loss.

Acceptance Criteria:
1. Planning-board and focus-item payloads include explicit schema version fields and migration-safe defaults.
2. Save operations are idempotent and preserve unknown fields for forward/backward compatibility.
3. Change snapshots include before/after payload hash and actor metadata.
4. Rollback path is documented and tested for latest prior version.
5. Contract tests validate malformed payload rejection with actionable error responses.
6. Feature rollout includes a kill-switch and recovery guidance in runbook.

### Theme CMP-T15: Audience Intelligence and Data Enrichment

#### Epic CMP-E15A: Segmentation and Contact Qualification

Execution status (2026-04-26):
- In build execution as next epic after `CMP-E14B`.
- Phase-1 delivery on current branch:
  - Segment builder workspace added in `/campaigns/automation`.
  - Segment definitions persisted in `campaigns.cadence_rule.segment_definitions` with schema/version fields.
  - Live segment estimate action added to `/api/campaigns` (`get-segment-estimate`) with audit logging.
  - Save flow preserves existing campaign automation metadata (including journey graph/planning/focus payloads).
  - Targeted e2e and contract coverage added for estimate + persistence paths.
- Phase-2 hardening on current branch:
  - Clone and archive segment actions now persist immediately, with audit-log events.
  - Segment estimate freshness/confidence surfaced per saved segment record.
  - Targeted e2e coverage now validates clone/archive persistence in addition to create/edit/save flow.

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

### Theme CMP-T18: Component Library Mapping and Design Consistency

#### Epic CMP-E18A: Campaign Surface Component Mapping and Token Compliance

**Story US-CMP-FE-1940: Map all campaign surfaces to approved component primitives**
As a frontend owner, I want every Campaigns surface mapped to approved component-library primitives so visuals and interaction patterns stay consistent.

Acceptance Criteria:
1. Campaigns module has a maintained component mapping matrix from each major UI section to approved component primitives.
2. All buttons, inputs, selects, pills, cards, banners, and modals in Campaigns use mapped primitives/tokens with no uncatalogued visual variants.
3. Any new Campaigns UI must include mapping updates before merge, including rationale for exceptions.
4. Mapping includes Figma/Component Library references for each primitive and token bundle.
5. Token usage follows shared semantic tokens only; hardcoded visual values are disallowed.
6. Story includes a migration checklist for legacy UI pieces still using non-standard classes.

**Story US-CMP-QA-1941: Enforce consistency gates for component mapping and visual drift**
As a QA owner, I want automated gates for mapping compliance and visual consistency so regressions are caught before staging.

Acceptance Criteria:
1. CI gate validates Campaigns surfaces against the component mapping matrix and fails on unmapped primitives.
2. Visual regression tests cover Campaigns core routes (`campaigns`, `content`, `review-queue`, `calendar`, `reports`, `automation`) in desktop and mobile viewports.
3. Accessibility checks are part of gating for mapped components (focus order, labels, contrast, keyboard navigation).
4. Design drift incidents create tracked backlog items with owner/severity and remediation ETA.
5. Evidence bundle for each Campaign epic includes mapping validation output and visual comparison artifacts.
6. Staging merge cannot proceed while mapping/visual drift gates are failing.

### Theme CMP-T19: Data Ingestion and Automation Source Intelligence

#### Epic CMP-E19A: Campaign Data Contracts for Posts, Search, and Research Signals

**Story US-CMP-BE-1942: Define canonical ingestion contracts for campaign post/search/research evidence**
As a platform owner, I want a canonical ingestion contract so campaign automation has consistent, auditable inputs from posting, search discovery, and research artifacts.

Acceptance Criteria:
1. A canonical ingestion schema is defined for post events, search evidence, and research findings with explicit schema versioning.
2. Ingestion writes are accepted only through existing stack paths (`Cloudflare Functions` + `Supabase`) with typed payload validation and reject reasons.
3. Every ingested record stores source metadata (`source_type`, `source_id`, `captured_at`, `confidence`, `coverage_scope`, `request_id`, `actor`).
4. Dedupe keys prevent duplicate writes for retried ingestion events while preserving idempotent upserts.
5. Invalid records are persisted to a dead-letter table/queue with actionable diagnostics and replay controls.
6. Contract tests cover valid payloads, missing required fields, schema version mismatch, duplicate retries, and out-of-order events.

**Story US-CMP-BE-1943: Build campaign source ledger and lineage APIs**
As an operator, I want source-lineage APIs so I can trace every campaign automation decision back to its post/search/research evidence.

Acceptance Criteria:
1. Campaign APIs expose a source-ledger view keyed by campaign, content item, and automation node.
2. Ledger records include joinable references to raw evidence rows and derived automation outcomes.
3. Read APIs support filters by source type, confidence band, freshness window, and ingestion status.
4. All lineage reads enforce capability-based access and redact restricted fields by role.
5. Report/export payloads include lineage manifest metadata (`generated_at`, filters, source coverage summary).
6. API contract tests validate permission-denied shapes, filter correctness, and manifest consistency.

#### Epic CMP-E19B: Automation Data Surfacing and Trust Signals

**Story US-CMP-FE-1944: Surface automation data provenance across Campaigns UI**
As a campaign user, I want provenance and trust signals on automation/report surfaces so I can tell which recommendations are current and what data they used.

Acceptance Criteria:
1. Campaign overview, automation timeline, segment cards, and reports surfaces display `last updated`, `source coverage`, and `confidence` indicators.
2. Post/search/research-derived metrics link to a drill-down panel showing contributing sources and timestamps.
3. Stale or low-confidence data states render deterministic warnings with remediation actions (`refresh now`, `review sources`, `narrow filters`).
4. UI states follow approved component-library mappings and semantic token usage defined in `CMP-T18`.
5. Mobile and desktop layouts preserve readability with no overflow and maintain keyboard/screen-reader accessibility.
6. E2E tests validate provenance rendering, stale-state warnings, and drill-down source inspection paths.

**Story US-CMP-QA-1945: Certify ingestion-to-UI traceability and regression gates**
As a QA lead, I want end-to-end traceability gates so automation data regressions are caught before staging/main merge.

Acceptance Criteria:
1. QA suite includes seeded-path tests proving ingestion events flow to ledger APIs and UI provenance surfaces without data loss.
2. Regression tests assert that automation recommendations and report cards include source coverage/confidence when upstream evidence exists.
3. Negative-path tests verify graceful degradation when ingestion is delayed, partially failed, or schema-rejected.
4. Gap-analysis output is required per release and must create backlog follow-ups for unresolved lineage, trust, or observability debt.
5. Staging promotion is blocked when traceability gates fail or source manifests are missing from evidence bundles.
6. Main merge requires explicit signoff that ingestion contracts, lineage APIs, and UI provenance ACs all passed on staging.

### Theme CMP-T20: Journey Completeness, Chatbot Routing Quality, and Cross-Module UX Parity

#### Epic CMP-E20A: Full Journey Click-Path Certification

**Story US-CMP-QA-1946: Build click-path matrix for all Campaigns entry points and critical actions**
As a product owner, I want a complete click-path matrix so every Campaigns workflow is verified for usability, path length, and regression risk.

Acceptance Criteria:
1. A maintained journey matrix covers all module entry points (hub card, direct route, sidebar route links, chatbot commands, deep-link drilldowns from reports/alerts).
2. Matrix includes primary and alternate paths for create/edit/review/claim/schedule/post/reminders/reports/automation actions.
3. Each path defines expected click count budget, required state preconditions, and fallback/recovery paths when prerequisites fail.
4. Every terminal user action in Campaigns has at least one deterministic assertion in e2e coverage.
5. Path matrix is versioned with release date and linked evidence artifacts.
6. No story in active Campaign epics can close without matrix-impact review and updates.

**Story US-CMP-FE-1947: Reduce interaction friction for high-frequency Campaign actions**
As an operator, I want lower-friction interaction paths so recurring Campaign actions require fewer clicks and less context switching.

Acceptance Criteria:
1. Top recurring actions (`create draft`, `submit review`, `claim`, `set reminder`, `mark posted`, `open automation`) have measured click/time baselines and optimized variants.
2. UI introduces context-preserving quick actions where safe, without bypassing permission checks or validation flows.
3. Keyboard-first affordances are available for high-frequency actions and documented in module help text.
4. Path optimizations preserve auditability and do not remove required reason capture for governed actions.
5. UX updates remain consistent with shared component-library patterns (`CMP-T18`) and include mobile parity behavior.
6. E2E coverage validates old and new paths during rollout flag period until cutover completes.

#### Epic CMP-E20B: Chatbot Intent Fidelity and Guided Flow Robustness

**Story US-CMP-CHAT-1948: Expand Campaign chatbot alias map and fuzzy routing confidence gates**
As a user, I want Oliver to resolve Campaign intents reliably (including typo/variant phrasing) so I can reach workflows without navigation friction.

Acceptance Criteria:
1. Command aliases include action synonyms, domain language variants, and common misspellings for Campaign workflows.
2. Fuzzy routing thresholds are measured with fixture phrases and must meet documented precision/recall targets for Campaign commands.
3. Ambiguous matches produce disambiguation prompts instead of executing incorrect actions.
4. Chatbot command telemetry records intent, selected action, confidence, and fallback usage for regression analysis.
5. Campaign chatbot behavior remains scoped to campaign conversation path guardrails.
6. E2E tests cover direct command hits, fuzzy typo recovery, ambiguous prompt handling, and out-of-scope requests.

**Story US-CMP-CHAT-1949: Harden guided-flow field mapping and validation prompts**
As an operator, I want guided chatbot flows to validate inputs predictably so malformed data cannot silently propagate into Campaign writes.

Acceptance Criteria:
1. All guided steps define explicit input normalization and validation messages for required, optional, and skipped values.
2. Entity/choice resolution logs when fallback matching is used and prompts user confirmation when confidence is below threshold.
3. Date/time, URL, and lifecycle-state inputs enforce canonical formatting before commit.
4. Failed flow commits return actionable remediation messages and preserve entered context for retry.
5. Guided flow results match equivalent UI form writes in data shape and audit metadata.
6. Contract and e2e tests verify parity between chatbot commits and direct UI commits.

#### Epic CMP-E20C: Cross-Module Design and Mobile Consistency

**Story US-CMP-FE-1950: Align Campaign shells and controls with global module design structure**
As a frontend owner, I want Campaign UI structure to mirror cross-module design standards so the module feels consistent with the rest of the system.

Acceptance Criteria:
1. Campaign shell hierarchy (header, sidebar, section cards, status banners, action rails) matches approved module baseline patterns used in sibling modules.
2. Shared primitives are consumed from component library mappings with documented exceptions and migration plans.
3. Visual density, spacing, typography scale, and status semantics align with global token definitions.
4. Error/empty/loading/recovery components use shared patterns and copy standards.
5. Cross-module parity checks include spot audits against Reviews, HR, and SDR module shells.
6. Visual regression suite includes parity snapshots across modules for comparable surface types.

**Story US-CMP-QA-1951: Mobile-first certification for all Campaign module surfaces**
As a QA owner, I want full mobile certification so Campaign routes remain usable and non-overlapping on small screens.

Acceptance Criteria:
1. Every Campaign route (`campaigns`, `content`, `review-queue`, `calendar`, `reminders`, `reports`, `automation`) has mobile viewport e2e coverage.
2. Tests assert no clipped controls, no horizontal overflow, and no hidden critical actions at defined breakpoints.
3. Mobile interactions include sidebar toggling, modal interactions, chatbot trigger/panel behavior, and section action controls.
4. Touch-target sizing and focus states meet accessibility standards in mobile and tablet layouts.
5. Any mobile regression automatically opens backlog defects with route, selector, and screenshot artifacts.
6. Staging promotion is blocked when mobile certification suite has unresolved failures.

### Theme CMP-T21: Information Architecture and Visualization Clarity

#### Epic CMP-E21A: High-Trust Data Presentation

**Story US-CMP-FE-1952: Standardize campaign metric card semantics and drill-down behavior**
As a campaign operator, I want metric cards to present consistent definitions and drill-down pathways so I can trust what each number means and act on it.

Acceptance Criteria:
1. Every metric card shows label, precise definition tooltip, aggregation window, and last-refresh timestamp.
2. Cards with actionable values provide deterministic drill-down links into filtered operational views.
3. Cards sourced from partial data include visible coverage/confidence badges with plain-language explanation.
4. Totals and breakdowns are numerically consistent across overview, reports, and export manifests.
5. Card visuals follow component-library mapping and semantic token constraints defined in `CMP-T18`.
6. E2E tests verify card-to-drilldown navigation and filter prepopulation.

**Story US-CMP-BE-1953: Add explicit metric-definition registry and API metadata contract**
As a backend owner, I want metric metadata returned with report payloads so frontend rendering is deterministic and avoids hardcoded assumptions.

Acceptance Criteria:
1. Report endpoints return metric metadata (`id`, `label`, `definition`, `window`, `unit`, `confidence`, `coverage`) with values.
2. Metric registry is versioned and backward-compatible for at least one prior version.
3. Payload includes provenance references for each metric family (tables/events/derived rules).
4. Unknown/unsupported metrics are ignored gracefully by clients with non-fatal warnings.
5. Contract tests validate metadata presence and compatibility envelopes.
6. Export jobs embed metric metadata manifest alongside generated data payload.

#### Epic CMP-E21B: Interaction Density and Cognitive Load Reduction

**Story US-CMP-FE-1954: Improve section-level information hierarchy and action grouping**
As a user, I want denser but clearer information hierarchy so I can scan status and execute next actions with minimal cognitive load.

Acceptance Criteria:
1. Each Campaign section has consistent hierarchy: summary strip, primary actions, secondary actions, content area, and system-state banner.
2. Related controls are grouped and labeled by intent (`create`, `review`, `schedule`, `analyze`) with clear disabled-state rationale.
3. Action bars remain sticky/visible where appropriate without occluding content or causing overlap.
4. Long lists include progressive disclosure patterns that preserve scanability and keyboard access.
5. Mobile layout keeps primary actions within two interactions from section load.
6. Story ships with before/after interaction maps and click-count deltas.

**Story US-CMP-QA-1955: Enforce visualization and interaction regression budgets**
As QA, I want regression budgets on layout stability and click-path complexity so UX does not degrade over time.

Acceptance Criteria:
1. Regression gates track and alert on click-count increases for critical journeys beyond approved thresholds.
2. Visual diff gates include overlap/clipping checks for key action bars, cards, filters, and modal shells.
3. Route-level performance budgets monitor first-interaction readiness and filter-apply responsiveness.
4. Budget exceptions require documented owner, expiry date, and remediation plan.
5. Evidence artifacts for each release include regression-budget results and approved exceptions.
6. Staging and main promotions are blocked for unresolved high-severity budget breaches.
