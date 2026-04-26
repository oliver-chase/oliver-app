# Campaign Content & Posting Module Audit and Build Backlog

Date: 2026-04-25  
Source PRD: `vtwo_campaign_content_posting_module_prd.md`  
Target app: `oliver-app` (Next.js static export + Supabase + Cloudflare Pages Functions)

## 0. Execution Status

Implementation execution started on 2026-04-25 with the following delivered foundations:

1. Campaign module route scaffold (`/campaigns`) with sidebar/topbar shell and mobile-first responsive behavior.
2. Shared auth/permission plumbing updates (`campaigns` permission across frontend/backend/chatbot guards).
3. Story backlog generation under `.github/user-stories/oliver-app/backlog/campaign-content-posting-module-2026-04-25`.
4. Supabase migration scaffold for campaign/content/activity/reminder/report tables.
5. Frontend data helper layer for lifecycle actions, logging, reminders, ICS download, and markdown report export.
6. Functional module workflows for create draft, submit review, approve/reject, self-claim, unclaim, schedule updates, mark posted, URL update, reminders, and summary reporting.
7. Content-card asset attach/remove controls, schedule controls, and post URL correction support in the campaigns workspace.
8. Expanded chatbot command/flow coverage for add-asset, review submit/approve/reject, unclaim, reminder, metrics, and export actions.
9. Migration hardening for campaign lifecycle RPC transitions, state constraints, reminder idempotency, and reporting/dashboard views.
10. Implemented Cloudflare function contracts for campaign reporting/export jobs (`/api/campaigns`) and scheduled operations (`/api/campaign-jobs`) with permission checks and service-role writes.
11. Added module-level admin automation controls for campaign jobs (dry-run/live reminders + missed detection) and server-backed report summary reads with local fallback.
12. Added report filters (preset/date/campaign/type) and export history download controls in `/campaigns` reports workspace.
13. Added campaign e2e coverage for report filter API payloads, admin automation dry-run output, export-history download flow, and mobile click-path/responsiveness checks for `/campaigns`.
14. Optimized report data connections by decoupling filter-driven summary fetches from full workspace reloads, and added report breakdown UI (campaign/topic/owner) backed by API groupings with local fallback.
15. Added frontend guardrails for report filter date ranges (invalid start/end blocked with inline validation).
16. Added admin review-queue sorting controls (oldest/newest/campaign/topic) plus bulk approve/reject actions with selection guardrails and campaign e2e coverage.
17. Added content-library filter controls (search/status/type/campaign/ownership) with reset + “showing X of Y” summary and campaign e2e coverage for filtered flows.
18. Added claimed-calendar filters/sort controls (timing/campaign/channel/query + overdue-first/soonest/latest/title), overdue prioritization, and campaign e2e coverage for scheduling workflows.
19. Replaced bulk-reject prompt with inline modal reason flow (required validation + confirm/cancel) and added campaign e2e coverage for reject-reason propagation.
20. Added campaign-list execution telemetry on each campaign card (status counts + cadence/open-slot summary + scheduled coverage and next-open-slot hint) computed from cadence rules and claimed/posted schedule data.
21. Replaced remaining prompt-based review/content actions (single reject and unclaim) with reusable reason modal UX and added campaign e2e coverage for modal validation and reject payload propagation.
22. Added calendar timeline workspace controls (weekly/monthly/list windows + window navigation) with date-grouped claimed/posted/missed/open-slot visibility backed by cadence-aware open-slot computation and campaign e2e coverage.
23. Added campaign schedule density heatmap (next 14 days) with campaign focus selector, cadence-vs-scheduled coverage metrics, and one-click "Focus Schedule" action to sync calendar campaign filters.

Remaining tickets below continue to be source-of-truth for completion and hardening.

## 1. Audit Outcome

The PRD is strong and buildable, but direct implementation in `oliver-app` requires several architecture-aware decisions.

1. The app is static export with no Next.js server runtime, so all privileged writes, scheduled jobs, reminder dispatch, and report exports must run through Cloudflare Pages Functions plus Supabase RPCs.
2. Module-level permissions are currently hardcoded across frontend and backend (`registry`, `PagePermission`, `/api/users`, chatbot path guards). Adding this module requires coordinated updates across all permission surfaces.
3. The PRD asks for strict lifecycle integrity, concurrency-safe claim/review actions, and audit logging. This cannot rely on frontend checks. It must be implemented in Postgres transactions/RPC.
4. Existing chatbot contract requires command aliases, route-scoped topics, and flow parity for write paths. The campaign module must ship with full command + flow coverage in the same release.
5. Existing UI conventions are token-driven (`tokens.css`, `components*.css`, `accounts.css` shell patterns). The module should mirror this structure, not introduce a new design language.

## 2. Critical Gap-Fill Decisions (Required Before Build)

1. **Module ID and route**: use module id `campaigns` and route `/campaigns`.
2. **Permission model**: expand `PagePermission` to include `campaigns`; admin keeps full access.
3. **State model source of truth**: enforce lifecycle exclusively via RPC transitions, not direct `update` from UI.
4. **Reviewer assignment**: start with queue-based reviewer assignment (`reviewer_id` nullable) and configurable rule hook later.
5. **Cadence slots**: compute open/filled slots from `campaigns.cadence_rule` + claimed/posted content; do not persist slots table in MVP.
6. **Reminder channel strategy**: MVP baseline is ICS download + in-app reminder records; Slack/email dispatch behind capability flags.
7. **Reporting source**: activity metrics from activity log events + content table timestamps; no dependency on external social APIs.
8. **Timezone policy**: all writes in UTC; UI renders in user local timezone with explicit date labels.
9. **Archive behavior**: `Posted` is terminal in UI and mapped to `archived_at` set; edits limited to post URL/performance notes by allowed actors.
10. **Admin override policy**: supported but isolated behind explicit override actions requiring reason metadata.

## 3. Solution Architecture (Oliver-App Native)

## 3.1 Required Frontend Additions

1. `src/app/campaigns/page.tsx` (module shell + state orchestration)
2. `src/app/campaigns/layout.tsx`
3. `src/app/campaigns/campaigns.css`
4. `src/app/campaigns/commands.ts`
5. `src/app/campaigns/flows.ts`
6. `src/components/campaigns/*` (dashboard, campaign list/detail, content library/detail, review queue, calendar, reports)
7. `src/lib/campaigns.ts` (typed client data access wrappers)
8. `src/types/campaigns.ts`

## 3.2 Required Shared-System Updates

1. `src/types/auth.ts` (`PagePermission` includes `campaigns`)
2. `src/modules/registry.ts` (new module card + defaults)
3. `src/lib/chatbot-conversation-paths.ts` (new scoped path)
4. `src/lib/chatbot-intents.ts` (intent regex and cross-module guards)
5. `functions/api/chat.js` (path scope guards and module labels)
6. `functions/api/users.js` (`VALID_PAGE_PERMISSIONS`, `ALL_PAGE_PERMISSIONS` include `campaigns`)
7. `scripts/check-module-boundaries.mjs` (add campaigns scope rules)

## 3.3 Required Backend/DB Additions

1. New Supabase migration set for campaign schema, indexes, RPC transitions, and RLS.
2. New CF Pages Functions for privileged operations (notification dispatch, exports, optional admin override endpoints).
3. Cron-triggerable endpoints for daily reminders and missed-post detection.

## 4. Data Model and Data-Connection Optimization

## 4.1 Tables

1. `campaigns`
2. `campaign_content_items`
3. `campaign_assets`
4. `campaign_activity_log`
5. `campaign_reminders`
6. `campaign_report_exports`
7. `campaign_content_metrics` (optional in MVP; feature-flagged manual entry)

## 4.2 Table-Level Constraints

1. `campaign_content_items.status` check: `draft|needs_review|unclaimed|claimed|posted`
2. `campaign_content_items` terminal-post invariant: if `status='posted'` then `posted_at` and `archived_at` must be non-null.
3. `campaign_content_items.claim` invariant: if `status='claimed'` then `posting_owner_id` and `scheduled_for` non-null.
4. `campaign_content_items.rejection_reason` required when transition is reject.
5. `campaign_reminders` unique idempotency key (`content_id`,`user_id`,`reminder_type`,`scheduled_for`,`status not in cancelled` via partial unique index logic).

## 4.3 High-Impact Indexes

1. `campaign_content_items(status, updated_at desc)`
2. `campaign_content_items(campaign_id, status, scheduled_for)`
3. `campaign_content_items(posting_owner_id, status, scheduled_for)`
4. `campaign_content_items(reviewer_id, status, created_at)`
5. `campaign_content_items(topic)`
6. Partial index for unclaimed browse: `where status='unclaimed'`
7. Partial index for missed detection: `where status='claimed'`
8. `campaign_activity_log(entity_type, entity_id, timestamp desc)`
9. `campaign_activity_log(action_type, timestamp desc)`
10. `campaign_reminders(status, scheduled_for)`
11. `campaign_report_exports(requested_by_user_id, requested_at desc)`

## 4.4 RPC/Transactional Write Contracts (Recommended)

Use RPC for all lifecycle transitions to guarantee backend integrity and concurrency control.

1. `campaign_submit_for_review(content_id, actor_user_id)`
2. `campaign_approve_content(content_id, actor_user_id)`
3. `campaign_reject_content(content_id, actor_user_id, reason)`
4. `campaign_claim_content(content_id, actor_user_id, channel, scheduled_for, request_id)`
5. `campaign_unclaim_content(content_id, actor_user_id, reason)`
6. `campaign_update_schedule(content_id, actor_user_id, scheduled_for)`
7. `campaign_mark_posted(content_id, actor_user_id, post_url)`
8. `campaign_update_post_url(content_id, actor_user_id, post_url)`
9. `campaign_admin_override(content_id, actor_user_id, action, reason, payload)`

Each RPC must:

1. Validate actor permissions.
2. Lock target row (`FOR UPDATE`) to prevent race conditions.
3. Validate current state transition eligibility.
4. Write state update + related side effects (reminder rows, archived_at, timestamps).
5. Insert `campaign_activity_log` row in same transaction.
6. Return updated row and normalized error code for UI.

## 4.5 Read Model Optimization

1. Create view `campaign_dashboard_rollup_v` for module landing metrics by user role scope.
2. Create view `campaign_report_metrics_v` for date-filtered aggregates.
3. Use keyed selectors in client (`campaign + filters + user`) to avoid recomputing large local arrays.
4. Batch initial module load with parallel queries (campaign counts, review queue, my claimed, today schedule) rather than serial fetch.

## 4.6 Integration Points

1. **Client direct Supabase**: non-privileged reads and allowed edits under RLS.
2. **CF function APIs**: report export generation, Slack/email sends, cron jobs, and any service-role fallback operation.
3. **ICS generation**: primary client-side download endpoint shape from content data; optional server route for consistency checks.
4. **Chatbot writes**: call same `src/lib/campaigns.ts` methods or shared API endpoints as standard UI, never separate logic.

## 5. Frontend IA and Streamlined User Flows

## 5.1 Screen Map

1. Dashboard (`/campaigns` default)
2. Campaign list
3. Campaign detail
4. Content library
5. Content detail
6. Review queue
7. Posting calendar/schedule
8. Reports/export

## 5.2 UI Structure to Mirror Existing Components

1. Reuse shell: `.app`, `.app-sidebar`, `.topbar`, `.main`.
2. Reuse controls: `.btn`, `.card`, `.app-badge`, `.app-chip`, `CustomPicker`, `AppModal`, `ConfirmModal`, `MessageToast`.
3. Reuse responsive behavior from existing module shells (`max-width: 500px` sidebar collapse and topbar hamburger).
4. Use token-only styling from `tokens.css` and shared component classes.
5. Keep dense action-first cards similar to HR/Reviews (claim, review, post actions visible in-line).

## 5.3 Primary Role Journeys

1. Contributor journey: create draft -> submit -> browse unclaimed -> claim -> copy/post -> mark posted -> optional URL.
2. Reviewer journey: review queue oldest-first -> approve/reject with reason -> monitor backlog.
3. Admin journey: create campaign + cadence -> monitor open slots/missed posts -> export summary.

## 5.4 Click-Efficiency Rules

1. Claim in <= 2 intentional clicks from content card.
2. Mark posted in <= 2 intentional clicks from claimed detail.
3. Copy content one-click with immediate toast confirmation.
4. Add-to-calendar visible directly after claim success.

## 6. Chatbot Flows With All Required Adds

## 6.1 Command Inventory

1. `add-campaign`
2. `add-content-draft`
3. `add-content-asset`
4. `submit-content-review`
5. `approve-content`
6. `reject-content`
7. `claim-content`
8. `unclaim-content`
9. `add-calendar-reminder`
10. `mark-posted`
11. `add-post-url`
12. `add-performance-metrics`
13. `open-review-queue`
14. `open-unclaimed-content`
15. `open-my-claimed`
16. `show-campaign-summary`
17. `export-campaign-summary`

## 6.2 Required Flow Contracts

Every write command above must have a flow with:

1. required step collection,
2. validation before mutation,
3. success message with deep-link,
4. clear failure text for invalid state or permission,
5. alias coverage for fuzzy matching.

## 6.3 Chatbot Platform Updates

1. Add conversation path id `campaigns` with allowed topics.
2. Extend `detectPathScopeViolation` and server-side chat guard patterns.
3. Register module flows in `/campaigns/page.tsx` via `buildModuleOliverConfig`.
4. Ensure cross-module ask returns deterministic prompt to open correct module.

## 6.4 Add-Focused Flow Examples

1. Add Campaign Flow: collects name, offer, audience, CTA, cadence, date range, status.
2. Add Content Draft Flow: collects title, body, type, topic, optional campaign/channel/author/assets.
3. Add Asset Flow: selects existing draft/content and appends external link or uploaded asset metadata.
4. Add Post URL Flow: targets posted content owned by user and validates URL format.
5. Add Performance Metrics Flow: prompts for impressions/clicks/likes/comments/reposts/notes with timestamp.

## 7. Epic and Ticket Backlog

## EPIC CMP-E0: Module Foundation and Access
Goal: add campaigns module into app architecture without breaking permission, routing, chatbot, or boundary contracts.

### Ticket CMP-ARCH-001: Register campaigns module and route shell
As an authorized user, I want to open a campaign module from the hub so I can use campaign workflows inside Oliver App.
So campaign execution lives inside the existing application shell.

Acceptance Criteria:
1. `campaigns` module appears in module registry with route `/campaigns`.
2. Hub card visibility follows assigned permissions.
3. Unauthorized users are redirected by `useModuleAccess` behavior.
4. Module route uses shared shell classes and responsive sidebar/topbar behavior.
5. Module route registers Oliver config and scoped conversation path.

### Ticket CMP-ARCH-002: Extend permissions across frontend and backend
As an admin, I want to grant or revoke campaign access so users only see module data they are allowed to use.
So permission boundaries remain consistent across UI and API.

Acceptance Criteria:
1. `PagePermission` includes `campaigns` in frontend types.
2. `/api/users` validates `campaigns` as a valid permission.
3. Admin UserManager can toggle `campaigns` permission.
4. Owner full-permission enforcement includes `campaigns`.
5. No regression in existing module permissions.

### Ticket CMP-ARCH-003: Update module-boundary enforcement
As a developer, I want module boundary checks to recognize campaigns scope so cross-module imports stay controlled.
So maintainability gates keep passing during campaign build.

Acceptance Criteria:
1. `scripts/check-module-boundaries.mjs` includes campaigns scope rules.
2. Campaign code can import shared/core primitives only.
3. Campaign code cannot import internals of accounts/hr/sdr/slides/reviews/admin.
4. Boundary script passes after campaigns files are added.

## EPIC CMP-E1: Campaign Management and Cadence
Goal: create/manage campaigns and configure cadence-driven posting slots.

### Ticket CMP-BE-110: Campaign schema and CRUD data access
As an admin, I want campaign records with strategy metadata and lifecycle status so content can be organized by initiative.
So campaign context is first-class in the module.

Acceptance Criteria:
1. `campaigns` table exists with required fields from PRD.
2. Date validation enforces `end_date >= start_date` when both provided.
3. CRUD wrappers exist in `src/lib/campaigns.ts`.
4. All create/update actions log activity events.
5. RLS restricts write access to authorized users.

### Ticket CMP-FE-111: Campaign list and detail screens
As a user, I want campaign list and detail views with lifecycle counts so I can understand campaign progress quickly.
So campaign work does not require manual reconciliation.

Acceptance Criteria:
1. Campaign list shows name, date range, status, state counts, and next open slot.
2. Campaign detail shows strategy fields, keyword tags, and grouped content status sections.
3. Campaign detail surfaces upcoming claimed posts and recent posted items.
4. Campaign detail shows activity feed for permitted roles.
5. Empty/loading/error states are explicit and recoverable.

### Ticket CMP-FE-112: Cadence rule editor and open-slot visualization
As an admin, I want to configure cadence and see open slots so scheduling gaps are visible.
So teams can claim content against real coverage needs.

Acceptance Criteria:
1. Campaign form supports cadence presets and simple custom weekday selection.
2. Open slots render in campaign detail and dashboard.
3. Filled slots reflect claimed content; completed slots reflect posted content.
4. Cadence updates affect future slots only.
5. Slot state styling clearly distinguishes open/claimed/posted.

## EPIC CMP-E2: Content Drafting and Asseting
Goal: support creation of campaign-ready content with optional assets and optional campaign link.

### Ticket CMP-BE-210: Content and asset schema foundation
As a contributor, I want content and asset records with lifecycle fields so drafting and posting can be tracked.
So data remains consistent from draft through archive.

Acceptance Criteria:
1. `campaign_content_items` and `campaign_assets` tables exist with required fields.
2. Status default is `draft`; posted state requires archive timestamps.
3. Assets support external link and file reference metadata.
4. RLS allows creator edits in draft only (unless override policy).
5. Seed indexes support status/campaign/topic filtering.

### Ticket CMP-FE-211: Create/edit draft workflow
As a contributor, I want to create and edit drafts with minimal friction so I can contribute content quickly.
So campaign content inventory grows without spreadsheet overhead.

Acceptance Criteria:
1. Draft form supports required and optional fields from PRD.
2. Draft save allows partial content with at least title or body.
3. Submit for review button enables only when required fields are complete.
4. Non-draft states render read-only for non-reviewer edits.
5. Save operations provide synced/loading/error feedback.

### Ticket CMP-FE-212: Asset add/remove and display in detail/posting views
As a contributor or posting owner, I want asset links/files attached to content so I can publish with required collateral.
So posting execution is not blocked by missing files.

Acceptance Criteria:
1. User can add/remove asset records without changing lifecycle state.
2. URL assets are validated before save.
3. Asset cards display in content detail and posting view.
4. Inaccessible asset links show warning state without crashing page.
5. Asset changes are logged in activity.

## EPIC CMP-E3: Review Queue and Approval Integrity
Goal: reviewers can process submissions quickly while preventing conflicting decisions.

### Ticket CMP-BE-310: Review lifecycle RPC transitions
As a system, I want backend-enforced submit/approve/reject transitions so invalid state changes cannot happen.
So review integrity does not depend on frontend button disabling.

Acceptance Criteria:
1. RPC transitions enforce Draft -> Needs Review -> Unclaimed or Draft.
2. Rejection requires reason text.
3. Failed transitions return structured errors.
4. Transition writes include activity log entries.
5. Concurrency guards prevent double finalization.

### Ticket CMP-FE-311: Review queue UI
As a reviewer, I want a queue sorted by oldest submitted first so pending content gets processed in order.
So review backlog remains visible and actionable.

Acceptance Criteria:
1. Queue defaults to `needs_review` content only.
2. Each row shows title, type, topic, campaign, creator, submitted timestamp.
3. Approve and reject actions are role-gated.
4. Empty queue state is explicit.
5. Queue refreshes when concurrent review conflict is detected.

### Ticket CMP-FE-312: Reviewer decision modals and creator feedback display
As a reviewer and creator, I want clear decision prompts and stored rejection context so revision loops are fast.
So content quality improves without ambiguity.

Acceptance Criteria:
1. Reject modal requires reason before submit.
2. Approve and reject actions show loading lock to prevent duplicate submissions.
3. Rejection reason displays on creator draft detail.
4. Creator gets notification record if notifications are enabled.
5. Decision actions are reflected in activity timeline.

## EPIC CMP-E4: Content Library, Search, and Discovery
Goal: make approved content discoverable and claimable with minimal browsing friction.

### Ticket CMP-FE-410: Role-aware default library views
As a contributor, I want unclaimed and my claimed content prioritized so I can act quickly.
So posting opportunities are obvious without heavy filtering.

Acceptance Criteria:
1. Default view emphasizes unclaimed + my claimed sections.
2. Posted content is hidden from default active view.
3. Claimed cards show owner/date based on permission.
4. Clear empty state when no available content.
5. Card actions map to state and role.

### Ticket CMP-FE-411: Library filter bar
As a user, I want to filter by campaign/topic/type/status/channel/author/assets so I can narrow content quickly.
So discovery scales as content volume grows.

Acceptance Criteria:
1. Filter controls use existing picker/button patterns.
2. Active filters are visible and removable.
3. Filter updates do not require full page reload.
4. Filter state can be reset in one action.
5. Filters respect user permission scope.

### Ticket CMP-BE-412: Search query support and indexing
As a user, I want search across title/body/topic/campaign so relevant content is easy to find.
So claim and review actions are faster.

Acceptance Criteria:
1. Search supports title/body matching at minimum.
2. Topic and campaign name matching is supported.
3. Search is scoped by RLS permissions.
4. Query performance remains stable under target dataset size.
5. No-results path returns deterministic empty state metadata.

## EPIC CMP-E5: Claiming, Scheduling, and Posting Execution
Goal: deliver strict self-claim workflow with low click-count and concurrency safety.

### Ticket CMP-BE-510: Claim/unclaim transactional logic
As a system, I want atomic claim and unclaim operations so two users cannot own the same content.
So ownership remains unambiguous.

Acceptance Criteria:
1. Only `unclaimed` items are claimable.
2. Claim always sets posting owner to current actor unless admin override route is used.
3. Duplicate claim attempts fail with conflict response.
4. Unclaim clears owner/schedule and cancels pending reminders.
5. Claim/unclaim actions are fully logged.

### Ticket CMP-FE-511: Claim and schedule interaction model
As a contributor, I want a fast claim flow with default date/channel so I can commit quickly.
So friction to participation stays low.

Acceptance Criteria:
1. Claim CTA appears only on unclaimed items.
2. Default channel is LinkedIn unless intended channel is set.
3. Default scheduled date is user-local today.
4. Success path offers ICS action immediately.
5. Conflict errors refresh card/detail state instantly.

### Ticket CMP-FE-512: Posting-ready detail and mark-posted action
As a posting owner, I want copy-first posting view and a clear completion action so I can close work quickly.
So claimed content exits active workflow when posted.

Acceptance Criteria:
1. Claimed detail emphasizes body copy and assets.
2. Copy-to-clipboard action includes toast confirmation.
3. Mark posted prompts optional URL.
4. Mark posted sets `posted_at`, `status=posted`, `archived_at`.
5. Posted content disappears from active queues immediately.

### Ticket CMP-BE-513: Post URL update contract after archive
As a posting owner, I want to add or correct post URL after posting so history remains accurate.
So reporting and audit links stay useful.

Acceptance Criteria:
1. URL can be added/updated in posted state by owner or authorized admin.
2. URL format is validated.
3. Lifecycle state remains posted.
4. URL update logs prior/new values.
5. Unauthorized updates return forbidden error.

## EPIC CMP-E6: Reminders, Missed Posts, and Notification Jobs
Goal: operationalize reminders and missed detection without adding extra lifecycle states.

### Ticket CMP-BE-610: Reminder records and ICS payload generation
As a claimer, I want calendar reminders generated from scheduled posts so I do not miss posting windows.
So planned posts remain visible in personal calendars.

Acceptance Criteria:
1. Claim action creates pending reminder record.
2. ICS payload includes title, scheduled time, module link, and posting instruction text.
3. ICS generation does not mutate content state.
4. ICS remains compatible with Outlook and Apple Calendar.
5. Reminder record is canceled when unclaimed or posted early.

### Ticket CMP-BE-611: Daily reminder dispatch job
As a system owner, I want idempotent daily reminders so users are notified once per due item.
So reminder automation is reliable and non-spammy.

Acceptance Criteria:
1. Job processes only claimed, unposted, due-today items.
2. Job skips canceled reminders.
3. Job marks sent/failure status and stores failure reason.
4. Job is idempotent across repeated executions.
5. Slack/email channel dispatch is feature-flagged by environment capability.

### Ticket CMP-BE-612: Missed-post detection job and computed flag
As a stakeholder, I want overdue claimed content surfaced as missed so execution gaps are obvious.
So campaigns can be corrected before momentum drops.

Acceptance Criteria:
1. Missed status is computed from claimed + past scheduled_for + grace period.
2. No new lifecycle status is introduced.
3. Missed indicator appears in dashboard/report/calendar datasets.
4. Optional owner notification is sent when item becomes missed.
5. Missed detection events are logged.

### Ticket CMP-FE-613: Calendar/schedule view with missed highlighting
As a user, I want date-grouped visibility into claimed/open/posted/missed items so planning is clear.
So I can coordinate posting commitments effectively.

Acceptance Criteria:
1. Weekly and monthly views render if component support exists; fallback to date-grouped list.
2. Campaign filter is available in calendar view.
3. Open slots, claimed items, posted items, and missed items have distinct visual states.
4. Clicking item opens content detail.
5. View remains usable on mobile.

## EPIC CMP-E7: Reporting and Export
Goal: provide campaign execution reporting that works without external analytics APIs.

### Ticket CMP-BE-710: Report metrics query layer
As a stakeholder, I want consistent metrics definitions so report numbers are trustworthy.
So status updates do not require manual reconciliation.

Acceptance Criteria:
1. Metrics definitions match PRD section 13 semantics.
2. Date-range and campaign filters are supported.
3. Metrics include created/submitted/approved/claimed/posted/missed/unclaimed/waiting-review.
4. Groupings include by user, campaign, topic.
5. Query outputs are permission-scoped.

### Ticket CMP-FE-711: Report dashboard UI and filter controls
As a stakeholder, I want a report workspace with quick date presets and campaign filters so I can produce updates fast.
So reporting is repeatable and low effort.

Acceptance Criteria:
1. Presets: last 7 days, last 30 days, current month, custom range.
2. Campaign and content type filters are displayed and applied.
3. Metrics cards and grouped tables/charts update on filter change.
4. Filter selections are visible in report header.
5. Loading/error/no-data states are clear.

### Ticket CMP-BE-712: Export job contract (HTML/markdown first, PDF optional)
As a stakeholder, I want shareable exports so I can send status without manually rewriting metrics.
So campaign communication scales.

Acceptance Criteria:
1. Export request stores `campaign_report_exports` job record.
2. Export output includes selected filters and required summary sections.
3. HTML/markdown export ships as MVP baseline.
4. PDF output is optional and feature-flagged by runtime capability.
5. Export actions are logged and permission-protected.

## EPIC CMP-E8: Chatbot Parity and Guided Workflows
Goal: support complete campaign workflows through Oliver Dock with no dead ends.

### Ticket CMP-CHAT-810: Campaign command and alias map
As a user, I want natural-language command discovery so I can start campaign tasks quickly in chat.
So chatbot routing mirrors UI capabilities.

Acceptance Criteria:
1. Campaign commands file includes create/search/quick/edit groups.
2. Every command includes at least one alias.
3. Commands cover all major workflows including "add" actions.
4. Command chips hide granular actions where appropriate.
5. Fuzzy matching surfaces top actions reliably.

### Ticket CMP-CHAT-811: Guided claim/create/summary flows
As a user, I want guided chatbot flows for claim, draft creation, and status summary so I can complete tasks without manual navigation.
So chatbot becomes a first-class execution path.

Acceptance Criteria:
1. Claim flow filters to unclaimed content only and enforces self-claim.
2. Create flow collects minimum required draft fields.
3. Summary flow asks campaign/date disambiguation when needed.
4. Flow writes call same backend contracts as UI.
5. Responses include deep-links to module screens.

### Ticket CMP-CHAT-812: Conversation scope and path guard updates
As a system owner, I want campaign path scoping in both client and server guards so cross-module prompts are deterministic.
So users are directed to correct modules without ambiguous behavior.

Acceptance Criteria:
1. `campaigns` path added to conversation path registry.
2. Client intent detection includes campaign keywords.
3. `/api/chat` guard patterns include campaigns path and cross-module blocks.
4. Out-of-scope asks return concise module-switch guidance.
5. Existing module path behavior remains unchanged.

## EPIC CMP-E9: Auditability, Validation, and Error Recovery
Goal: make all lifecycle actions auditable, safe, and user-understandable under contention/failure.

### Ticket CMP-BE-910: Unified activity logging model
As an admin, I want a complete activity trail so I can audit campaign operations and resolve disputes.
So state history is transparent.

Acceptance Criteria:
1. All state-changing actions write `campaign_activity_log`.
2. Log includes actor, action, entity, timestamp, metadata snapshot.
3. System actor entries are supported for jobs.
4. Admin can view logs via scoped query.
5. Unauthorized users cannot read sensitive log metadata.

### Ticket CMP-BE-911: Backend transition validator and error taxonomy
As a frontend developer, I want stable error codes for invalid transitions so UI can show actionable feedback.
So retries and refresh behavior are reliable.

Acceptance Criteria:
1. Invalid transitions return deterministic machine-readable code.
2. Permission failures return forbidden code.
3. Concurrency conflicts return conflict code.
4. Not-found and already-processed states are differentiated.
5. Tests cover valid/invalid transition matrices.

### Ticket CMP-FE-912: Loading, success, and failure state standardization
As a user, I want clear action feedback so I do not accidentally duplicate writes.
So confidence and reliability improve.

Acceptance Criteria:
1. All mutation buttons show busy/disabled state in-flight.
2. Duplicate click submissions are prevented.
3. Success feedback uses module-standard toast/message pattern.
4. Failures show specific, non-generic error text.
5. Stale-state conflicts trigger auto-refresh prompt.

## EPIC CMP-E10: Performance and Scale Hardening
Goal: keep dashboard/library/report interactions responsive as content volume grows.

### Ticket CMP-BE-1010: Query/index tuning and explain-plan gates
As a system owner, I want indexed core queries so list/report pages remain fast under growth.
So user experience remains stable.

Acceptance Criteria:
1. Core list/report queries have supporting indexes.
2. Explain plan review documented for worst-case queries.
3. Slow-query thresholds defined and monitored.
4. Index bloat and maintenance notes are documented.
5. Migration includes rollback-safe index strategy.

### Ticket CMP-FE-1011: Data fetch batching and cache invalidation strategy
As a user, I want fast dashboard loads and accurate refresh after mutations.
So I see current data without full reload penalties.

Acceptance Criteria:
1. Initial dashboard load batches independent queries.
2. Mutation success invalidates impacted slices only.
3. Polling/subscription strategy avoids unnecessary fetch storms.
4. Calendar/report views reuse cached filter datasets where safe.
5. Mobile performance remains acceptable on slower networks.

### Ticket CMP-BE-1012: Idempotency and dedupe for reminders/exports
As an operator, I want repeated job triggers to be safe so retries do not create duplicates.
So operational reliability improves.

Acceptance Criteria:
1. Reminder send job dedupes on idempotency key.
2. Export job dedupes or supersedes duplicate pending requests per filter signature.
3. Retry policies are bounded and logged.
4. Failed jobs preserve actionable error reason.
5. Manual rerun path exists for admins.

## EPIC CMP-E11: QA, Rollout, and Definition of Done Gates
Goal: ship module with controlled rollout and verified user journeys.

### Ticket CMP-QA-1110: Story and test coverage baseline
As a release owner, I want coverage for key contributor/reviewer/admin flows so regressions are caught early.
So rollout risk stays low.

Acceptance Criteria:
1. User stories added under `.github/user-stories/oliver-app/backlog/...` for new module.
2. Smoke tests cover create -> review -> claim -> post path.
3. Permission tests cover unauthorized access attempts.
4. Concurrency tests cover duplicate claim and conflicting review decisions.
5. Chatbot flow tests cover claim/create/summary flows.

### Ticket CMP-QA-1111: Rollout controls and migration safety
As an operator, I want safe rollout controls so module launch can be staged and reversed if needed.
So production stability is preserved.

Acceptance Criteria:
1. Feature flag controls module visibility by environment.
2. DB migrations are additive and backward compatible.
3. Rollback playbook exists for function-level failures.
4. Data backfill steps are documented where required.
5. Staging signoff checklist completed before production exposure.

### Ticket CMP-QA-1112: MVP DoD verification checklist
As product owner, I want explicit DoD checks mapped to PRD so launch readiness is objective.
So acceptance is unambiguous.

Acceptance Criteria:
1. Checklist maps each PRD DoD item to implemented ticket evidence.
2. Contributor, reviewer, and admin scenario walkthroughs are completed.
3. Activity log, state validation, and permission checks are verified.
4. ICS reminder generation verified on both Mac and Windows calendar imports.
5. Reporting/export outputs validated against known fixtures.

## 8. Build Sequence Recommendation

1. CMP-E0 foundation and permission plumbing.
2. CMP-E1 + CMP-E2 schema and core CRUD.
3. CMP-E3 review + claiming transitions (RPC first, then UI).
4. CMP-E4 discovery surfaces.
5. CMP-E5 reminders/calendar/missed detection.
6. CMP-E7 reporting/export.
7. CMP-E8 chatbot parity.
8. CMP-E9 and CMP-E10 hardening.
9. CMP-E11 QA + rollout.

## 9. MVP Exit Checklist

1. Contributor can draft -> submit -> claim -> post end-to-end.
2. Reviewer can approve/reject with required rejection reason.
3. Claim is self-only and concurrency-safe.
4. Posted content archives out of active views.
5. ICS reminder is available post-claim.
6. Dashboard/report metrics render without external analytics.
7. Activity log captures all state-changing actions.
8. Chatbot supports guided claim, guided create, and guided status summary.
9. Permission gates enforce access across UI, API, and chatbot paths.
