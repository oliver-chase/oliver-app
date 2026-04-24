# Oliver App Traceability Matrix

Generated from story files, aggregate story index, coverage audit, README/config docs, tech-debt docs, Cloudflare functions, Supabase migrations, scripts, and key Next.js app/component surfaces. `Verified` remains false in the story library; verification method here indicates the available evidence path, not completed validation.

## Summary

- Fully traced behaviors: 34
- Partially traced behaviors: 4
- Missing acceptance coverage / uncovered behaviors: 2
- Story files considered: 121
- Orphan stories: 0
- Orphan behaviors: 2

## Matrix

| Behavior ID | Short Description | Source Location | Related Story IDs | AC Coverage | Verification Method | Evidence Location | Notes / Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B-001 | Static Next.js app shell and root layout | src/app/layout.tsx; src/app/globals.css; README.md | US-OLV-001 | Full | Build/lint/typecheck | .github/workflows/ci.yml | Root layout, metadata, providers, shared styles covered. |
| B-002 | Cloudflare Pages static export config | next.config.ts; README.md | US-OLV-002 | Full | Build/lint/typecheck | next.config.ts; .github/workflows/ci.yml | Static export and trailing slash behavior covered. |
| B-003 | Supabase browser client and account data loading | src/lib/supabase.ts; src/hooks/useAccountsData.ts; README.md | US-OLV-003, US-OLV-047 | Full | Manual review | src/lib/supabase.ts; src/hooks/useAccountsData.ts | Public env client, load, sync, and error state traced. |
| B-004 | Design token loading and global style structure | src/app/tokens.css; src/app/globals.css; src/app/components*.css | US-OLV-004, US-OLV-106 | Full | Build/lint/typecheck | scripts/check-tokens.mjs | Token usage and drift scan covered. |
| B-005 | Repo workflow and deploy documentation | README.md; CLAUDE.md; AGENTS.md; src/tech-debt/deep-qa-workflow.md | US-OLV-005, US-OLV-117, US-OLV-126 | Full | Manual review | README.md; src/tech-debt/STATE.md; src/tech-debt/deep-qa-workflow.md | Branch/deploy guidance and repeatable QA docs traced. |
| B-006 | MSAL login route and auth session restore | src/app/login/page.tsx; src/context/AuthContext.tsx; src/lib/msalConfig.ts | US-OLV-006, US-OLV-007 | Full | Manual review | src/context/AuthContext.tsx | Depends on Azure env at runtime. |
| B-007 | Route guard behavior for private pages | src/components/auth/AuthGuard.tsx; src/app/layout.tsx | US-OLV-008 | Full | Manual review | src/components/auth/AuthGuard.tsx | No automated auth tests. |
| B-008 | App users schema and service-role proxy | supabase/migrations/001_app_users.sql; functions/api/users.js; src/lib/users.ts | US-OLV-009, US-OLV-013, US-OLV-014 | Full | Manual review | functions/api/users.js | RLS/proxy behavior covered; deployment not verified. |
| B-009 | Permission-gated module visibility | src/app/page.tsx; src/context/UserContext.tsx; src/lib/users.ts | US-OLV-010 | Full | Manual review | src/context/UserContext.tsx | Implementation now resolves the signed-in Azure user through `/api/users`; live validation still depends on seeded `app_users` data. |
| B-010 | Admin shortcuts and admin route access | src/app/page.tsx; src/app/admin/page.tsx; src/context/UserContext.tsx | US-OLV-011, US-OLV-012 | Full | Manual review | src/app/admin/page.tsx | Admin access now depends on the mounted UserProvider resolving an admin role from `app_users`. |
| B-011 | Hub module directory and cards | src/app/page.tsx; src/components/hub/ModuleCard.tsx | US-OLV-015, US-OLV-016, US-OLV-017 | Full | Manual review | src/app/page.tsx | Hub cards and session controls traced. |
| B-012 | Accounts route shell, portfolio, and account detail navigation | src/app/accounts/page.tsx; src/components/accounts/AccountsApp.tsx; PortfolioView.tsx; AccountView.tsx | US-OLV-018, US-OLV-019, US-OLV-020, US-OLV-022 | Full | Manual review | src/components/accounts/AccountsApp.tsx | Route/page behavior covered. |
| B-013 | Account mutation workflows | src/components/accounts/AccountsApp.tsx; src/lib/db.ts | US-OLV-021, US-OLV-024, US-OLV-025, US-OLV-026, US-OLV-042 | Full | Manual review | src/lib/db.ts | Create/edit/archive/delete cascade traced. |
| B-014 | Accounts navigation, topbar, filterbar, sync, and error boundary | Sidebar.tsx; Topbar.tsx; Filterbar.tsx; AccountsApp.tsx | US-OLV-027, US-OLV-028, US-OLV-029, US-OLV-047, US-OLV-048 | Full | Manual review | src/components/accounts/AccountsApp.tsx | Includes AccountView crash fallback. |
| B-015 | Account sections for overview, people, org chart, actions, opportunities, projects, notes | src/components/accounts/*Section.tsx; OrgChart.tsx | US-OLV-023, US-OLV-030, US-OLV-031, US-OLV-032, US-OLV-033, US-OLV-034, US-OLV-035, US-OLV-036, US-OLV-037, US-OLV-038, US-OLV-039 | Full | Manual review | src/components/accounts | All major account section CRUD/workflows traced. |
| B-016 | Account export and export note scoping | src/components/accounts/ExportPanel.tsx | US-OLV-040, US-OLV-041 | Full | Manual review | src/components/accounts/ExportPanel.tsx | Uses browser print blob. |
| B-017 | Shared pickers, portals, destructive modals, soft delete | Picker.tsx; Popover.tsx; CustomPicker.tsx; AppModal.tsx; ConfirmModal.tsx; useSoftDelete.tsx | US-OLV-043, US-OLV-044, US-OLV-045, US-OLV-046 | Full | Manual review | src/components/shared; src/hooks/useSoftDelete.tsx | Shared interaction primitives traced. |
| B-018 | Account import pipeline: local transcript, document/image parse, review, conflict dry run, commit, failure handling | AccountsApp.tsx; transcript-parser.ts; parse-document.js; parse-image.js; confirm-write.js; TranscriptReviewModal.tsx | US-OLV-049, US-OLV-050, US-OLV-051, US-OLV-052, US-OLV-053, US-OLV-054, US-OLV-055 | Full | Manual review | functions/api/confirm-write.js | Contract covered; real AI behavior not verified. |
| B-019 | OliverDock chat, commands, fuzzy matching, step flows, voice, export/reset, context refresh | OliverDock.tsx; OliverContext.tsx; fuzzy.ts; app/*/commands.ts; app/*/flows.ts | US-OLV-056, US-OLV-057, US-OLV-058, US-OLV-059, US-OLV-060, US-OLV-061, US-OLV-062, US-OLV-063, US-OLV-064, US-OLV-065, US-OLV-066, US-OLV-067, US-OLV-110, US-OLV-111, US-OLV-112 | Full | Manual review | src/components/shared/OliverDock.tsx | Includes fallback/error states and per-module contexts. |
| B-020 | Chat history persistence schema | supabase/chat_messages.sql; functions/api/chat-messages.js; OliverDock.tsx | US-OLV-109 | Full | Manual review | functions/api/chat-messages.js | OliverDock now loads, rewrites, and clears history through the chat-messages API; live behavior still depends on the updated schema being applied in Supabase. |
| B-021 | HR route shell, dashboard, navigation, global search, loading/sync states | src/app/hr/page.tsx; HrDashboard.tsx; GlobalSearch.tsx | US-OLV-068, US-OLV-069, US-OLV-070 | Full | Manual review | src/app/hr/page.tsx | HR load and navigation behavior traced. |
| B-022 | HR quick adds and hiring pipeline | src/app/hr/page.tsx; HrHiring.tsx; EditCandidateModal.tsx; InterviewLogModal.tsx | US-OLV-071, US-OLV-072, US-OLV-073 | Full | Manual review | src/components/hr/HrHiring.tsx | Candidate CRUD, interviews, promotion traced. |
| B-023 | HR source upload and AI candidate intake | src/components/hr/AIIntakeModal.tsx; functions/api/parse-image.js | US-OLV-074, US-OLV-119 | Full | Manual review | src/components/hr/AIIntakeModal.tsx | Tabular candidate files are parsed locally; image uploads use the JSON image parse contract. |
| B-024 | Receipt parser for HR/device source files | src/lib/parsers/receipt-parser.ts | US-OLV-075 | Full | Manual review | src/lib/parsers/receipt-parser.ts | Heuristic parser traced. |
| B-025 | HR directory, offboarding, onboarding, inventory, assignments, tracks, reports, settings | src/components/hr/HrDirectory.tsx; HrOnboarding.tsx; HrInventory.tsx; HrAssignments.tsx; HrTracks.tsx; HrReports.tsx; HrSettings.tsx | US-OLV-076, US-OLV-077, US-OLV-078, US-OLV-079, US-OLV-082, US-OLV-083, US-OLV-084, US-OLV-085 | Full | Manual review | src/components/hr | Major HR pages traced. |
| B-026 | HR device assignment/return guided flows | src/components/hr/flows/device-flows.tsx | US-OLV-080, US-OLV-081 | Full | Manual review | src/components/hr/flows/device-flows.tsx | Supabase error paths included. |
| B-027 | HR modal step runner and double-submit/error handling | src/components/hr/StepFlowRunner.tsx; src/components/hr/flows/*.tsx | US-OLV-086, US-OLV-087 | Full | Manual review | src/components/hr/StepFlowRunner.tsx | Busy and error paths traced. |
| B-028 | Supabase write error helpers and sync state failure handling | src/lib/db-helpers.ts; src/lib/db.ts; HR/account components | US-OLV-088 | Full | Manual review | src/lib/db-helpers.ts | Covers non-throwing Supabase client behavior. |
| B-029 | SDR workspace, overview, prospects, detail, queued drafts, outreach | src/app/sdr/page.tsx; src/components/sdr/*.tsx | US-OLV-089, US-OLV-090, US-OLV-091, US-OLV-092, US-OLV-093, US-OLV-095, US-OLV-096 | Partial | Manual review | src/app/sdr/page.tsx | Read/detail covered; pipeline edit story remains In Progress. |
| B-030 | SDR draft approve/reject | src/components/sdr/SdrDrafts.tsx; src/app/sdr/flows.ts; functions/api/sdr-approve.js | US-OLV-094 | Full | Manual review | functions/api/sdr-approve.js | Backend endpoint now exists; live behavior still depends on deployed Supabase credentials and schema. |
| B-031 | CRM placeholder route and CRM Oliver config | src/app/crm/page.tsx | US-OLV-097, US-OLV-098 | Partial | Manual review | src/app/crm/page.tsx | CRM product itself Not Started; placeholder/config present. |
| B-032 | Admin token editor, user manager, component library | src/app/admin/page.tsx; src/components/admin/*.tsx | US-OLV-099, US-OLV-103 | Partial | Manual review | src/components/admin | Panels are implemented; live access depends on a resolved admin role from `app_users`. |
| B-033 | Runtime token overrides and failure handling | src/lib/tokens.ts; TokenOverridesLoader.tsx | US-OLV-100, US-OLV-121 | Full | Manual review | src/components/shared/TokenOverridesLoader.tsx | Console-only failure handling noted. |
| B-034 | Design system reference and dead-token audit | src/app/design-system/page.tsx; src/app/design-system/ds.css | US-OLV-101, US-OLV-102 | Full | Manual review | src/app/design-system/page.tsx | Design-system page traced. |
| B-035 | AI provider key management and Anthropic fallback | functions/api/admin/keys.js; functions/api/_shared/ai.js | US-OLV-104, US-OLV-105 | Full | Manual review | functions/api/_shared/ai.js | No automated API contract tests. |
| B-036 | CI, token scanner, Node/build configuration | package.json; .github/workflows/ci.yml; scripts/check-tokens.mjs; .nvmrc | US-OLV-106, US-OLV-107, US-OLV-108 | Full | Build/lint/typecheck | .github/workflows/ci.yml | Automated CI evidence exists. |
| B-037 | Responsive shells, modal/popover layout, HR spacing, pill styling | CSS files; src/tech-debt/locked.md; src/tech-debt/margin-scale.md; tests/e2e/frontend-smoke.spec.ts | US-OLV-113, US-OLV-114, US-OLV-115, US-OLV-116, US-OLV-123, US-OLV-125 | Full | Manual review + browser smoke | src/tech-debt/locked.md; tests/e2e/frontend-smoke.spec.ts | Smoke covers representative shell, modal, picker, and placeholder/control behavior; not full visual regression. |
| B-038 | Browser smoke coverage for primary routes and core controls | tests/e2e/frontend-smoke.spec.ts; playwright.config.ts | US-OLV-122, US-OLV-124, US-OLV-125 | Full | Browser smoke | tests/e2e/frontend-smoke.spec.ts | Covers route shells, top-level navigation, representative module interactions, non-admin visibility/access behavior, and redirect/render regressions. |
| B-039 | Clipboard copy support | design-system/page.tsx; HrInventory.tsx; NotesSection.tsx; SdrProspectDetail.tsx | US-OLV-120 | Full | Manual review | src/components/hr/HrInventory.tsx | Clipboard failure handling is limited. |
| B-040 | User story backfill artifacts |  .github/user-stories/_index.md; .github/user-stories/oliver-app | US-OLV-118 | Full | Manual review | .github/user-stories/_index.md | Backfill artifact traced. |
| B-041 | Coverage audit artifact |  .github/user-stories/oliver-app/audits/_coverage-audit.md | (none) | Missing | None | .github/user-stories/oliver-app/audits/_coverage-audit.md | Orphan behavior: audit doc has no story, and is stored outside the flat story directory so prompt-lint does not treat it as story markdown. |
| B-042 | Analytics, notifications, webhooks, scheduled jobs | repo-wide search; _coverage-audit.md | (none) | Missing | None | .github/user-stories/oliver-app/audits/_coverage-audit.md | Orphan behavior category: explicitly absent; no implemented surface found. |

## Orphan Stories

None.

## Orphan Behaviors

- B-041 Coverage audit artifact: Orphan behavior: audit doc has no story, and prompt-lint treats it as invalid story markdown.
- B-042 Analytics, notifications, webhooks, scheduled jobs: Orphan behavior category: explicitly absent; no implemented surface found.

## Highest-Risk Gaps

- Permission and admin stories now have implementation coverage, but they still need manual validation in an environment with service-role users API access and seeded admin data.
- Chat history persistence now has code coverage, but still needs manual validation against a Supabase project with the updated schema applied.
- The coverage audit is an orphan behavior and is stored under `audits/` because prompt-lint treats every markdown file in the flat story folder as a story.
- Automated browser smoke now covers the primary shells and representative controls, but the majority of behavior still relies on manual review or environment-backed validation.
