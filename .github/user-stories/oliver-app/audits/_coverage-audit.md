# Oliver App Story Coverage Audit

## Coverage Summary

- Routes/pages: fully covered for /, /login, /accounts, /hr, /sdr, /crm, /admin, and /design-system. CRM remains intentionally Not Started beyond its placeholder shell and Oliver config.
- Commands and assistant flows: partially covered. OliverDock, quick chips, fuzzy commands, account/HR/SDR flows, and reset/export/mic behavior are covered; HR Candidate Intake is now explicitly marked Broken because its API request contract does not match the parse functions.
- Services/APIs: fully covered for /api/chat, /api/parse-document, /api/parse-image, /api/confirm-write, /api/users, /api/admin/keys, shared Anthropic config/fallback, and Supabase write helpers. /api/sdr-approve remains uncovered in implementation and covered by a Broken story.
- Auth and permissions: partially covered. MSAL login/session/route guard code is covered; module permission/admin behavior is covered as Broken because UserContext is currently an intentional bypass/default context.
- Data models and mutations: fully covered for account entities, HR candidates/employees/devices/assignments/tracks/tasks/onboarding, SDR prospect reads/edits, app_users, token overrides, and chat_messages schema. Chat history persistence remains In Progress because the schema exists without OliverDock persistence code.
- External integrations and env/config: fully covered for Supabase public env, Supabase service role proxy, Azure MSAL env, Anthropic/ai_config/env fallback, Cloudflare Pages static export/functions, CI, and token scanner behavior.
- Imports/exports/syncs: fully covered for account import parse/review/dry-run/commit, account export print blob, Oliver conversation export, HR source upload, receipt parser, sync indicators, and refresh callbacks. HR Candidate Intake import is covered as Broken.
- Webhooks/scheduled tasks/jobs: no implemented webhooks, cron jobs, scheduled tasks, or background workers were found. No Not Started stories were added for absent infrastructure beyond CRM and chat persistence because there is no code surface to validate.
- Loading, empty, retry, fallback, error states: partially covered. Major loading/error/sync states, API failures, parse failures, retry buttons, fallback API key behavior, and token override load failures are covered. Some console-only failures remain high risk.
- Admin/ops/debug/support/analytics/logging/notifications: partially covered. Admin users/tokens/components, tech-debt docs, CI, token drift, debug AccountView boundary, console logging, and clipboard support are covered. No analytics or notification subsystem was found.

## Newly Added Stories

- US-OLV-119 Import HR candidate lists with AI intake
- US-OLV-120 Copy operational values to clipboard
- US-OLV-121 Handle token override load failures

## Stories With Expanded Acceptance Criteria

- US-OLV-056 Answer contextual chat
- US-OLV-074 Upload HR source files
- US-OLV-104 Store AI provider keys
- US-OLV-105 Call Anthropic with fallback key

## Remaining Gaps

- HR Candidate Intake is Broken until AIIntakeModal sends JSON requests matching /api/parse-document and /api/parse-image.
- SDR draft approval is Broken until /api/sdr-approve exists or the UI/flows are rewired to an implemented endpoint.
- Module permissions and admin visibility remain Broken until UserContext/UserProvider is wired to authenticated app_users data.
- Chat history persistence remains In Progress because supabase/chat_messages.sql exists but OliverDock does not persist or reload messages.
- CRM remains Not Started beyond the placeholder route and static Oliver roadmap config.
- No analytics, notification, webhook, cron, or scheduled job implementation was found; these are absent rather than partially implemented.

## High-Risk Areas

- Auth/permissions drift: MSAL/AuthGuard are active, while UserContext permissions are still bypassed.
- API contract drift: HR Candidate Intake uses request shapes that do not match parse API handlers.
- Missing SDR approval backend: both SdrDrafts and SDR Oliver flows reference /api/sdr-approve.
- Console-only failures: token override load failures, some clipboard failures, account save/delete failures, and soft-delete expiry failures rely on console logging or sync state rather than explicit recovery UI.
- AI provider configuration: chat and parse workflows depend on ai_config or ANTHROPIC_API_KEY and fail at runtime when missing.
