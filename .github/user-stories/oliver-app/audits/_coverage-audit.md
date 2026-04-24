# Oliver App Story Coverage Audit

## Coverage Summary

- Routes/pages: fully covered for /, /login, /accounts, /hr, /sdr, /slides, /crm, /admin, and /design-system. CRM remains intentionally Not Started beyond its placeholder shell and Oliver config. Local browser smoke now also covers `/`, `/accounts`, `/hr`, `/sdr`, `/slides`, `/crm`, `/admin`, and `/design-system`.
- Commands and assistant flows: partially covered. OliverDock, quick chips, fuzzy commands, account/HR/SDR flows, and reset/export/mic behavior are covered; HR Candidate Intake now parses tabular files locally and uses the image parse API only for image uploads.
- Services/APIs: fully covered for /api/chat, /api/chat-messages, /api/parse-document, /api/parse-image, /api/confirm-write, /api/users, /api/admin/keys, /api/sdr-approve, /api/slides, shared Anthropic config/fallback, and Supabase write helpers.
- Auth and permissions: partially covered. MSAL login/session/route guard code is covered; module permission/admin behavior now has implementation through the mounted UserProvider and `/api/users`, and browser smoke now includes a non-admin visibility/access check. Live behavior still depends on configured Azure claims and seeded `app_users` rows.
- Data models and mutations: fully covered for account entities, HR candidates/employees/devices/assignments/tracks/tasks/onboarding, SDR prospect reads/edits, app_users, token overrides, chat_messages schema, and slides/template/audit entities (`slides`, `slide_templates`, `slide_audit_events`). OliverDock history now reads/writes through `/api/chat-messages`, with local fallback if the backend path is unavailable.
- External integrations and env/config: fully covered for Supabase public env, Supabase service role proxy, Azure MSAL env, Anthropic/ai_config/env fallback, Cloudflare Pages static export/functions, CI, and token scanner behavior.
- Imports/exports/syncs: fully covered for account import parse/review/dry-run/commit, account export print blob, Oliver conversation export, HR source upload, receipt parser, candidate intake parsing/review, sync indicators, refresh callbacks, and slide import/save/autosave/export smoke checks (including round-trip fixture checks).
- Webhooks/scheduled tasks/jobs: no implemented webhooks, cron jobs, scheduled tasks, or background workers were found. No Not Started stories were added for absent infrastructure beyond CRM and chat persistence because there is no code surface to validate.
- Loading, empty, retry, fallback, error states: partially covered. Major loading/error/sync states, API failures, parse failures, retry buttons, fallback API key behavior, and token override load failures are covered. Smoke tests cover representative shell/control failures, but some console-only failures remain high risk.
- Admin/ops/debug/support/analytics/logging/notifications: partially covered. Admin users/tokens/components, tech-debt docs, CI, token drift, debug AccountView boundary, console logging, and clipboard support are covered. No analytics or notification subsystem was found.

## Newly Added Stories

- US-OLV-119 Import HR candidate lists with AI intake
- US-OLV-120 Copy operational values to clipboard
- US-OLV-121 Handle token override load failures
- US-OLV-122 Maintain browser regression smoke suite
- US-OLV-123 Preserve cross-page shell and heading consistency
- US-OLV-124 Preserve primary navigation and action targets
- US-OLV-125 Standardize interactive controls and placeholder states
- US-OLV-126 Document repeatable deep QA workflow

## Slides Canonicalization Update (2026-04-24)

- Added slide module backlog bundle: `backlog/slides-module-ux-be-backlog-2026-04-24`.
- Added canonical slide backfill/cleanup stories:
  - `US-SLD-001` Backfill Slide Module Shell and Access Contract
  - `US-SLD-002` Backfill HTML Import Command and Flow Contract
  - `US-SLD-003` Promote Slide Parser Security and Normalization Stories to Canonical Coverage
  - `US-SLD-004` Align Slide Module Copy With Current Capabilities
  - `US-SLD-005` Include Slides in Coverage and Verification Audits
- Existing implemented parser hardening stories remain tracked in requirements backlog:
  - `US-O13`, `US-O14`, `US-O15`, `US-O16`
- Added S1 + S3 implementation stories:
  - `US-SLD-010`..`US-SLD-013` (import UX hardening + reliability fixtures)
  - `US-SLD-030`..`US-SLD-036` (data model/API, save/autosave, template wiring, export contract, recovery/conflict, audit telemetry, regression suite)

## Stories With Expanded Acceptance Criteria

- US-OLV-056 Answer contextual chat
- US-OLV-074 Upload HR source files
- US-OLV-104 Store AI provider keys
- US-OLV-105 Call Anthropic with fallback key

## Remaining Gaps

- Module permissions and admin visibility rely on the mounted UserProvider and `/api/users`, but still need manual validation in an environment with real `app_users` data and at least one seeded admin.
- Chat history persistence now depends on the updated `chat_messages` schema being applied in Supabase so `/api/chat-messages` can write Azure/app-user keyed rows successfully.
- CRM remains Not Started beyond the placeholder route and static Oliver roadmap config.
- Slide module now has persisted save/library/export contracts, but editor interaction stories (`US-SLD-020`..`US-SLD-025`) remain not started.
- No analytics, notification, webhook, cron, or scheduled job implementation was found; these are absent rather than partially implemented.

## High-Risk Areas

- Auth/permissions drift: MSAL/AuthGuard are active again and UserProvider is mounted, but live env assumptions still need to stay aligned with the `app_users` bootstrap path.
- Candidate intake parsing is heuristic for tabular files and still depends on image AI extraction for screenshots/photos.
- Console-only failures: token override load failures, some clipboard failures, account save/delete failures, and soft-delete expiry failures rely on console logging or sync state rather than explicit recovery UI.
- AI provider configuration: chat and parse workflows depend on ai_config or ANTHROPIC_API_KEY and fail at runtime when missing.
- Slides editor depth gap: selection/drag/resize/text tooling/undo-keyboard accessibility (`US-SLD-020`..`US-SLD-025`) are the largest remaining product risk.
