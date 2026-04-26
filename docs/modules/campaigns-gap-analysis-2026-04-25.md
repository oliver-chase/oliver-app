# Campaigns Module Gap Analysis (2026-04-25)

## Audit Scope
- Spec baseline: "Campaigns Module: Frontend, Backend, and User Story Specification" (full request scope).
- Codebase audited: `src/app/campaigns/page.tsx`, `src/components/campaigns/CampaignsLanding.tsx`, `src/lib/campaigns.ts`, `src/types/campaigns.ts`, `functions/api/campaigns.js`, `functions/api/campaign-jobs.js`, `supabase/migrations/014_campaign_content_posting_foundation.sql`, `tests/e2e/campaigns-module.spec.ts`, `tests/e2e/frontend-smoke.spec.ts`.
- Status keys:
  - `Implemented`: requirement is present and wired.
  - `Partial`: requirement exists but does not match spec fully.
  - `Missing`: requirement absent.

## Critical Finding Summary
1. Sidebar navigation now supports route-backed subpages (`/campaigns/campaigns`, `/campaigns/content`, `/campaigns/review-queue`, `/campaigns/calendar`, `/campaigns/reports`) instead of only in-page scroll anchors.
2. Current UX is still primarily card-based and monolithic, not a true campaign workspace shell with a persistent per-campaign header + tabbed views.
3. Backend schema and workflow are built around `draft -> needs_review -> unclaimed -> claimed -> posted`, which diverges from required statuses and review/scheduling/reminder domain model in the spec.
4. Comments/review thread model, schedule entries table, and required reminder model are not implemented.
5. Server permissions are module-level and transition-level, but not mapped to the full action permission matrix requested.
6. E2E coverage is broad for current implementation, but missing for spec-critical features that are not yet implemented (side panel, comments, reminder lifecycle, schedule entries, per-action permissions).

## Frontend Architecture Gap Matrix

### 1) Campaigns Landing Page
- Structured campaign list/cards: `Implemented` (cards and lifecycle counts exist).
- Summary row with exact required metrics (active campaigns, awaiting review, scheduled this week, overdue): `Partial`.
- Search + filters for status/owner/date at landing level: `Missing` (filters are mostly in content/report sections, not landing summary).
- Utility subtitle and CTAs (`Create Campaign`, `Import Content`): `Partial` (`Create Campaign` exists; `Import Content` missing).
- Max-width centered workspace layout: `Partial` (consistent spacing/tokens used; not a strict bounded dashboard shell).

### 2) Campaign Workspace Shell
- Persistent campaign header (name/status/owner/date/channels/key metrics/action): `Partial` (campaign detail card exists, but not persistent across all views).
- Workspace navigation tabs: `Partial` (sidebar links + section headings exist; no explicit tab strip in the content header area).
- Unified visual system across views: `Partial` (shared cards/styles are present, but views still feel section-based and uneven).

### 3) Overview View
- Dedicated overview view tied to selected campaign snapshot: `Partial` (landing overview + lifecycle cards, but not spec-grade per-campaign overview tab).
- Next Actions panel with prioritized operational actions: `Missing`.
- Recent activity feed in overview with scannable event stream: `Partial` (activity timeline exists in campaign detail card, not as first-class overview panel).

### 4) Content View
- Table/list hybrid with required columns: `Partial` (card list, not table/list hybrid; several fields shown, but not full column contract).
- Required statuses across module (`Draft`, `In Review`, `Changes Requested`, `Approved`, `Scheduled`, `Posted`, `Blocked`, `Archived`): `Missing` (uses `draft`, `needs_review`, `unclaimed`, `claimed`, `posted`).
- Search/filter/sort matrix from spec: `Partial` (search + filters present; due-date/reviewer/date-range sorts not fully represented).
- Row quick actions (claim/review/approve/request-changes/schedule): `Partial` (many actions present; no explicit `request changes` state model, no `approved`/`scheduled` stages as specified).
- Mobile usability: `Implemented` for existing UI (responsive rules + mobile tests exist), but not against spec table requirements.

### 5) Content Detail Side Panel
- Right-side panel opening from list row: `Missing`.
- Metadata + editable draft + review thread + activity in side panel: `Missing` (content is inline cards; no side panel shell).

### 6) Review Queue View
- Review queue with operational filters (unclaimed, assigned to me, changes requested, approved but unscheduled, overdue): `Partial`.
- Queue row data contract (submitted by, claimed by, time in review, priority): `Partial` (some fields shown; not full contract).
- Actions (claim/open/approve/request changes/reassign/release/schedule): `Partial`.
- Visual urgency handling: `Partial`.

### 7) Calendar View
- Month/week/list views: `Implemented`.
- Scheduled + unscheduled visibility with filtering by campaign/channel/status: `Partial`.
- Drag-to-schedule/reschedule: `Missing`.
- Event cards with consistent color mapping by status/channel: `Partial`.

### 8) Reminders View
- Dedicated reminders workspace tab: `Missing` (reminders are embedded with calendar/jobs controls).
- Reminder CRUD lifecycle (create/edit/complete/reassign/snooze/delete): `Missing`.
- Reminder data contract in UI (related campaign/content, assigned user, notes): `Missing`.

### 9) Reporting View
- Campaign progress cards: `Implemented` (current summary cards present).
- Review operations throughput (avg review time, change-request count, overdue review items): `Missing`.
- Publishing section with missed/delayed: `Partial` (missed tracked; delayed semantics not explicit).
- Export/generate report: `Implemented` (server export jobs + history + download).

## Backend Requirements Gap Matrix

### 1) Campaign Data Model
- Required fields (`id,name,description,status,owner_id,start_date,end_date,channels,goals,created_at,updated_at,archived_at`): `Partial`.
- Notes: current table has strategy fields (`offer_definition`, `target_audience`, `primary_cta`, `keywords`) but no explicit `owner_id`, `channels`, `goals`, `archived_at`.

### 2) Content Item Data Model
- Required fields (`owner_id`, `reviewer_id`, `due_date`, `scheduled_at`, etc.): `Partial`.
- Notes: uses `posting_owner_id`, `reviewer_id`, `scheduled_for`; lacks `due_date`, explicit `scheduled_at` naming, and some required workflow fields.

### 3) Review State
- Durable review fields (`review_status`, `submitted_at/by`, `claimed_at/by`, `approved_at/by`, `changes_requested_at/by`, feedback summary): `Missing`.
- Notes: transition RPCs exist, but timestamps/actors are tracked mostly via activity log and current row status, not dedicated review-state columns.

### 4) Comments and Feedback
- Comment table + types + resolved state: `Missing`.

### 5) Activity Log
- Activity logging exists: `Implemented`.
- Exact required event taxonomy from spec: `Partial` (current events are present but names differ and coverage is not 1:1 with required list).

### 6) Scheduling
- Separate schedule-entry model with timezone/status history: `Missing`.
- Notes: schedule currently stored directly on content item (`scheduled_for`) and inferred via activity/jobs.

### 7) Reminders
- Reminder model exists: `Partial`.
- Required fields/statuses (`campaign_id`, `content_item_id`, `assigned_to`, `due_at`, `open/snoozed/completed/canceled/overdue`): `Missing/Partial`.
- Notes: current reminders are channel-delivery reminders (`pending/sent/failed/cancelled`), not task reminders.

### 8) Permissions
- Frontend gating via `useModuleAccess('campaigns')`: `Implemented`.
- Server-side module-level authorization for `/api/campaigns` and `/api/campaign-jobs`: `Implemented`.
- Full granular action permissions matrix (view/create/edit/review/approve/schedule/report/archive): `Missing`.

## User Story Coverage (Grouped)

### Campaign Landing
- View overview: `Partial`.
- Create campaign: `Implemented` (basic flow), but field set diverges from spec (`channels/goals/owner` gaps).

### Workspace + Next Actions
- Open unified workspace with persistent campaign context: `Partial`.
- Next Actions prioritization: `Missing`.

### Content Management
- View content with robust filters/sort: `Partial`.
- Create content item: `Implemented` (current draft form).
- Edit content item in focused detail context: `Partial` (inline card editing/actions, no side panel).

### Detail Panel
- Open content without leaving list via side panel: `Missing`.
- Metadata-first reviewer context + missing metadata flags: `Missing/Partial`.

### Review Queue
- Submit for review: `Implemented`.
- Queue visibility + filters: `Partial`.
- Claim item: `Implemented` (status model differs from spec path).
- Approve content: `Implemented` (admin-gated; transitions to `unclaimed`, not explicit `approved` state).
- Request changes with required feedback: `Partial` (reject flow exists with required reason, but dedicated `changes requested` state is missing).

### Calendar/Scheduling
- View scheduled content: `Implemented` for current `claimed/posted` model.
- Schedule approved content: `Partial` (scheduling tied to claim state, not `approved -> scheduled` workflow).
- Reschedule content: `Implemented` for claimed items via RPC.

### Reminders
- Create reminder: `Partial` (creation exists via workflow helpers, not full reminder-task UI).
- Complete reminder: `Missing` in current reminder-domain implementation.

### Reporting
- View reporting: `Partial`.
- Generate report: `Implemented` (export jobs + downloads).

## Visual Design System Requirement Gaps
- Reusable status/chip/card components and tokenized spacing: `Partial/Implemented`.
- Required empty states for every major surface: `Partial`.
- Loading/error states for major surfaces: `Implemented` for key module fetches; `Partial` for all feature-level states.
- Buttons hierarchy + destructive semantics: `Partial`.
- Strict consistent status badge taxonomy across all views: `Missing` vs required spec statuses.

## E2E Coverage Audit

### Covered Well (current implementation)
- Report filters and API payload integration.
- Export history download.
- Review approve/reject flows and validation.
- Content filter chips and default action queue.
- Calendar timeline filters and cadence/open-slot density behaviors.
- Migration/access-policy degraded states.
- Partial-migration fallback (`campaign_assets` missing table).
- Mobile shell/responsiveness smoke paths.
- Sidebar subpage route link coverage (added test in `tests/e2e/campaigns-module.spec.ts`).

### Coverage Gaps
- No E2E for side-panel behavior (feature absent).
- No E2E for comments/review thread lifecycle (feature absent).
- No E2E for reminder task lifecycle (create/edit/complete/snooze/reassign/delete).
- No E2E for schedule-entry records/timezone/status transitions (feature absent).
- No E2E for granular server permission matrix by action.
- No E2E for true `approved -> scheduled -> posted` state flow because model differs.
- No E2E for dedicated workspace tabs with persistent campaign header because current shell is section-based.

## High-Risk Mismatches To Address First
1. Align workflow statuses and backend state model to spec (`In Review`, `Changes Requested`, `Approved`, `Scheduled`, `Blocked`, `Archived`) while preserving migration compatibility.
2. Add dedicated content detail side panel and comment/review-thread domain.
3. Introduce separate schedule entries and task-style reminders model.
4. Add granular server permissions for each major action.
5. Implement true campaign workspace shell (persistent campaign header + tabbed subviews) and retire legacy all-sections view after E2E migration.

## Recommended Execution Order
1. Data model migrations: review state, comments, schedule entries, reminders v2, status normalization.
2. API/service refactor: permission matrix + transition endpoints + backward-compat adapters.
3. Frontend shell refactor: persistent campaign header + tab views + side panel.
4. E2E expansion: add missing story-critical journeys before removing legacy paths.

## Implementation Story Pack
- Prioritized themes, epics, and implementation-ready user stories are tracked in:
- `/.github/oliver-app/modules/campaigns-module/README.md`
