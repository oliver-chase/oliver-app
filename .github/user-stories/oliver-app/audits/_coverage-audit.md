# Oliver App Story Coverage Audit

## Coverage Summary

- Routes/pages: fully covered for /, /login, /accounts, /hr, /sdr, /crm, /admin, and /design-system. CRM remains intentionally Not Started beyond its placeholder shell and Oliver config. Local browser smoke now also covers `/`, `/accounts`, `/hr`, `/sdr`, `/crm`, `/admin`, and `/design-system`.
- Commands and assistant flows: partially covered. OliverDock, quick chips, fuzzy commands, account/HR/SDR flows, and reset/export/mic behavior are covered; HR Candidate Intake now parses tabular files locally and uses the image parse API only for image uploads.
- Services/APIs: fully covered for /api/chat, /api/chat-messages, /api/parse-document, /api/parse-image, /api/confirm-write, /api/users, /api/admin/keys, /api/sdr-approve, shared Anthropic config/fallback, and Supabase write helpers.
- Auth and permissions: partially covered. MSAL login/session/route guard code is covered; module permission/admin behavior now has implementation through the mounted UserProvider and `/api/users`, and browser smoke now includes a non-admin visibility/access check. Live behavior still depends on configured Azure claims and seeded `app_users` rows.
- Data models and mutations: fully covered for account entities, HR candidates/employees/devices/assignments/tracks/tasks/onboarding, SDR prospect reads/edits, app_users, token overrides, and chat_messages schema. OliverDock history now reads/writes through `/api/chat-messages`, with local fallback if the backend path is unavailable.
- External integrations and env/config: fully covered for Supabase public env, Supabase service role proxy, Azure MSAL env, Anthropic/ai_config/env fallback, Cloudflare Pages static export/functions, CI, and token scanner behavior.
- Imports/exports/syncs: fully covered for account import parse/review/dry-run/commit, account export print blob, Oliver conversation export, HR source upload, receipt parser, candidate intake parsing/review, sync indicators, and refresh callbacks.
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

## Stories With Expanded Acceptance Criteria

- US-OLV-056 Answer contextual chat
- US-OLV-074 Upload HR source files
- US-OLV-104 Store AI provider keys
- US-OLV-105 Call Anthropic with fallback key

## Remaining Gaps

- Module permissions and admin visibility rely on the mounted UserProvider and `/api/users`, but still need manual validation in an environment with real `app_users` data and at least one seeded admin.
- Chat history persistence now depends on the updated `chat_messages` schema being applied in Supabase so `/api/chat-messages` can write Azure/app-user keyed rows successfully.
- CRM remains Not Started beyond the placeholder route and static Oliver roadmap config.
- No analytics, notification, webhook, cron, or scheduled job implementation was found; these are absent rather than partially implemented.

## High-Risk Areas

- Auth/permissions drift: MSAL/AuthGuard are active again and UserProvider is mounted, but live env assumptions still need to stay aligned with the `app_users` bootstrap path.
- Candidate intake parsing is heuristic for tabular files and still depends on image AI extraction for screenshots/photos.
- Console-only failures: token override load failures, some clipboard failures, account save/delete failures, and soft-delete expiry failures rely on console logging or sync state rather than explicit recovery UI.
- AI provider configuration: chat and parse workflows depend on ai_config or ANTHROPIC_API_KEY and fail at runtime when missing.
