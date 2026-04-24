# Oliver App Verification Audit

This audit read the story index, all story files, coverage audit, traceability matrix, CI workflow, package scripts, and searched for test/spec files. The repo now includes a committed Playwright browser smoke suite in `tests/e2e/frontend-smoke.spec.ts` alongside CI's typecheck, CSS token scan, and static Next build gates.

## Verification Summary

- Total canonical index stories (`US-OLV-*`): 126
- Additional backlog stories (`US-O*`, `US-SLD-*`): 39
- Strong verification path (canonical): 7
- Weak verification path (canonical): 119
- No meaningful verification path (canonical): 0
- Automated test files found: 1
- CI commands: npm run typecheck, npm run check-tokens, npm run build
- Browser smoke command: npm run test:smoke

## Test Strength By Staging Group

| Group | Story Range | Current Test Strength | Notes |
| --- | --- | --- | --- |
| Platform, Auth, Admin, and Infra | US-OLV-001..017, 099..108, 117, 118, 121, 126 | Medium | CI gates are strong; auth/admin behavior still needs more live-environment assertions. |
| Accounts Workspace | US-OLV-018..055 | Low-Medium | Smoke covers shell and nav; deep mutation/import/export paths are mostly manual. |
| OliverDock and AI Workflows | US-OLV-056..067, 109..112, 119 | Low | Runtime/API and provider fallback paths are still mostly manual. |
| HR Workspace | US-OLV-068..088, 120 | Low-Medium | Smoke covers nav and representative controls; most mutation flows remain manual. |
| SDR and CRM Workspace | US-OLV-089..098 | Low-Medium | SDR shell/detail/approval surfaces exist; full pipeline edit still incomplete and mostly manual. |
| UI Consistency and QA Hardening | US-OLV-113..116, 122..125 | Medium-High | This is the strongest area due browser smoke and explicit deep-QA workflow docs. |
| Slides Module (Backlog) | US-SLD-001..005, 010..013, 030..036 | Medium | Import hardening, persistence contracts, template library, export contract, and regression suite are now implemented; S2 editor interaction stories remain. |

## Slides Backlog Stories (`US-SLD-001..005`, `US-SLD-010..013`, `US-SLD-030..036`)

| Story ID | Title | Status | Verification Path | Strength | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| US-SLD-001 | Backfill Slide Module Shell and Access Contract | Code Present | Browser smoke + manual review | Weak | tests/e2e/frontend-smoke.spec.ts; src/app/slides/page.tsx | `/slides` route shell and permission gate behavior are implemented. |
| US-SLD-002 | Backfill HTML Import Command and Flow Contract | Code Present | Browser smoke + manual review | Weak | src/app/slides/commands.ts; src/app/slides/flows.ts; tests/e2e/frontend-smoke.spec.ts | Import-file and parse-pasted action wiring exists. |
| US-SLD-003 | Promote Slide Parser Security and Normalization Stories to Canonical Coverage | Code Present | Browser smoke + manual review | Weak | src/components/slides/html-import.ts; tests/e2e/frontend-smoke.spec.ts | Parser sanitization/normalization and warning behavior is covered by smoke tests. |
| US-SLD-004 | Align Slide Module Copy With Current Capabilities | Code Present | Browser smoke + manual review | Weak | src/modules/registry.ts; src/app/slides/page.tsx | Copy now reflects shipped import/save/export contracts and backlog editor scope. |
| US-SLD-005 | Include Slides in Coverage and Verification Audits | Code Present | Manual review | Weak | .github/user-stories/_index.md; audits/_coverage-audit.md; audits/_traceability-matrix.md | Audit/index inclusion is explicit. |
| US-SLD-010..013 | Import UX hardening + reliability fixtures | Code Present | Browser smoke regression | Medium | tests/e2e/slides-regression.spec.ts; tests/fixtures/slides/*.html | Covers preflight validation, progress/cancel UX, structured results, and import/export round-trip drift tolerance. |
| US-SLD-030..036 | Slides platform FE/BE contracts | Code Present | Browser smoke regression + manual review | Medium | src/lib/slides.ts; functions/api/slides.js; supabase/migrations/003_slides_platform.sql; tests/e2e/slides-regression.spec.ts | Covers persistence schema, save/autosave, template/my-slides wiring, export contract, conflict recovery, audit telemetry, and FE/BE regression checks. |

| Story ID | Title | Status | Verification Path | Strength | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| US-OLV-001 | Bootstrap app shell | Code Present | Build/lint/typecheck | Strong | .github/workflows/ci.yml; package.json; next.config.ts | Backdated from the initial Create Next App commit. |
| US-OLV-002 | Configure static export | Code Present | Build/lint/typecheck | Strong | .github/workflows/ci.yml; package.json; next.config.ts | Cloudflare Pages Functions still provide API endpoints separately from the static app. |
| US-OLV-003 | Wire Supabase browser client | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Client-side Supabase access is intentional for most module data. |
| US-OLV-004 | Load shared design tokens | Code Present | Build/lint/typecheck | Strong | scripts/check-tokens.mjs; .github/workflows/ci.yml | Later milestones harden token enforcement with CI. |
| US-OLV-005 | Document staging workflow | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | README was rewritten later to match current state. |
| US-OLV-006 | Provide Microsoft login | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Code is present in AuthProvider/AuthGuard/login; end-to-end Azure env behavior is not human-verified. |
| US-OLV-007 | Preserve auth session | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Depends on configured Azure client and tenant environment variables. |
| US-OLV-008 | Guard private routes | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Code present; historical docs conflict with current MSAL reintroduction. |
| US-OLV-009 | Model app users | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Schema and API code exist; UserProvider is mounted and resolves the signed-in Azure user through `/api/users`, but live validation still depends on seeded `app_users` data. |
| US-OLV-010 | Restrict module visibility | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implementation now loads `app_users` through UserProvider; live validation still depends on Azure identity claims and users API configuration. |
| US-OLV-011 | Expose admin shortcuts | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Admin links now depend on UserProvider resolving an admin role from `app_users` and are rendered in the hub session bar. |
| US-OLV-012 | Operate admin workspace | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Admin route now checks the mounted UserProvider; real access still depends on seeded admin data. |
| US-OLV-013 | Proxy app user CRUD | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Direct client access is intentionally avoided in src/lib/users.ts. |
| US-OLV-014 | Enforce app users RLS | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implementation exists in migration/API; database application was not verified here. |
| US-OLV-015 | Show module directory | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | CRM exists as a stub route. |
| US-OLV-016 | Render module cards | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Component is present under src/components/hub. |
| US-OLV-017 | Show hub session controls | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Depends on MSAL being configured in the deployed environment. |
| US-OLV-018 | Serve accounts route | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Code present; data shape depends on Supabase tables. |
| US-OLV-019 | Browse account portfolio | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Portfolio behavior was refined across Apr 16-20 commits. |
| US-OLV-020 | Group account cards by tier | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Specific tier labels depend on current Supabase data. |
| US-OLV-021 | Edit account client company on card | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Added after the initial portfolio migration. |
| US-OLV-022 | Open account detail | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Rendered inside an ErrorBoundary that reports AccountView crashes. |
| US-OLV-023 | Edit account overview | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Several follow-up commits fixed cadence, headings, and empty states. |
| US-OLV-024 | Edit account name in topbar | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Topbar behavior was corrected across multiple visual QA commits. |
| US-OLV-025 | Archive and unarchive accounts | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implemented through AccountsApp account save flow. |
| US-OLV-026 | Delete accounts cascade | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Failure is logged; there is no visible recovery toast for this path. |
| US-OLV-027 | Navigate account sidebar | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Sidebar navigation was restored in follow-up commits. |
| US-OLV-028 | Show shared topbar | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Topbar order and labels were repeatedly tuned to match source. |
| US-OLV-029 | Filter account workspace | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Filter reset and propagation were corrected after initial implementation. |
| US-OLV-030 | Manage account stakeholders | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Includes seniority, executive, incomplete, V.Two owner, and engagement filters. |
| US-OLV-031 | Visualize org chart | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Touch behavior and circular guards were added in follow-up fixes. |
| US-OLV-032 | Prevent invalid reporting loops | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Backdated from people/orgchart QA fixes. |
| US-OLV-033 | Manage account actions | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Section header, filters, and body wrappers were refined after initial port. |
| US-OLV-034 | Track account opportunities | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Promotion includes caveats for stakeholder data loss where applicable. |
| US-OLV-035 | Promote opportunity to project | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Exact field mapping should be verified against live data. |
| US-OLV-036 | Track account projects | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Backdated from initial project section plus later movement workflow. |
| US-OLV-037 | Move project to opportunity | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implemented as a recovery/correction workflow. |
| US-OLV-038 | Capture account notes | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Note parsing/markdown support was refined later. |
| US-OLV-039 | Manage note attendees | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implemented inside NotesSection attendee controls. |
| US-OLV-040 | Export account data | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Uses browser APIs rather than a server-side PDF renderer. |
| US-OLV-041 | Choose export note scope | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Code present in ExportPanel note toggles. |
| US-OLV-042 | Add new accounts | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Full client name was added on Apr 18. |
| US-OLV-043 | Use custom pickers | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Native select replacement was a repeated migration theme. |
| US-OLV-044 | Support picker portals | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Backdated from portal dropdown and pill style fixes. |
| US-OLV-045 | Confirm destructive actions | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Replaced native prompt/confirm flows. |
| US-OLV-046 | Undo soft deletes | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Used across selected account and HR deletion flows. |
| US-OLV-047 | Sync account data | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Some individual save failures are console-only and should be verified. |
| US-OLV-048 | Recover from AccountView crash | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Marked as temporary in commit history but still present. |
| US-OLV-049 | Parse local transcripts | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Parser output is designed to match /api/parse-document schema. |
| US-OLV-050 | Parse uploaded documents | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Actual docx/pdf text extraction quality depends on browser readAsText and API behavior. |
| US-OLV-051 | Parse org chart images | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Vision extraction requires configured AI provider keys. |
| US-OLV-052 | Review parsed transcripts | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Review modal is shared by the upload pipeline. |
| US-OLV-053 | Detect import conflicts | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Conflict detection is intentionally narrow. |
| US-OLV-054 | Commit imported account data | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Uses anon key in confirm-write per current function implementation. |
| US-OLV-055 | Handle import write failure | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | No automatic rollback is needed because writes are attempted as a batch of independent requests. |
| US-OLV-056 | Answer contextual chat | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | AI provider must be configured in ai_config/env. |
| US-OLV-057 | Handle chat provider failures | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Failure handling is user-visible inside OliverDock. |
| US-OLV-058 | Open OliverDock | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Locked invariant says not to mount extra chatbot components. |
| US-OLV-059 | Capture voice input | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Browser support varies. |
| US-OLV-060 | Export Oliver conversation | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Parse cards and write prompts are not included as normal chat messages. |
| US-OLV-061 | Reset Oliver conversation | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implemented in OliverDock resetOliver. |
| US-OLV-062 | Show quick command chips | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Granular/fuzzy split was added on Apr 22. |
| US-OLV-063 | Suggest fuzzy commands | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Uses a lightweight local fuzzy scorer. |
| US-OLV-064 | Run Oliver step flows | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Separate from older HR StepFlowRunner modal flows. |
| US-OLV-065 | Run accounts chat flows | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Specific flow list is derived from src/app/accounts/flows.ts. |
| US-OLV-066 | Run HR chat flows | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Additional HR modal step flows also exist for richer entity operations. |
| US-OLV-067 | Run SDR chat flows | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Specific flow behaviors should be verified against src/app/sdr/flows.ts. |
| US-OLV-068 | Browse HR dashboard | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | HR data comes from multiple Supabase tables. |
| US-OLV-069 | Navigate HR sections | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Responsive sidebar behavior was tuned later. |
| US-OLV-070 | Search HR records globally | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implemented with GlobalSearch and GlobalSearchButton. |
| US-OLV-071 | Quick add HR records | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Uses dbWrite to surface Supabase errors. |
| US-OLV-072 | Manage hiring pipeline | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Detailed behavior spans HrHiring, EditCandidateModal, InterviewLogModal, and flow files. |
| US-OLV-073 | Promote candidate to employee | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Promotion behavior should be browser-verified end to end. |
| US-OLV-074 | Upload HR source files | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Receipt parsing is client-side; resume parsing behavior depends on configured flows. |
| US-OLV-075 | Parse receipt uploads | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Parser is heuristic and should be tested with real receipts. |
| US-OLV-076 | Manage employee directory | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Offboarding is handled as a separate workflow. |
| US-OLV-077 | Start employee offboarding | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implemented in HrDirectory and emp flows. |
| US-OLV-078 | Manage onboarding runs | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Exact task UI should be verified manually. |
| US-OLV-079 | Manage device inventory | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Device deletion has both component and guided-flow variants. |
| US-OLV-080 | Assign devices | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implemented in device-flows.tsx. |
| US-OLV-081 | Return devices | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implemented in device-flows.tsx. |
| US-OLV-082 | Browse device assignments | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Assignment page received date/avatar QA fixes. |
| US-OLV-083 | Manage HR tracks and tasks | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Uses dbWriteMulti/dbWrite for Supabase writes. |
| US-OLV-084 | View HR reports | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Activity section was removed during later reports cleanup. |
| US-OLV-085 | Configure HR settings | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Exact list editing behavior should be verified in browser. |
| US-OLV-086 | Run HR modal step flows | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Separate from OliverDock conversational flows. |
| US-OLV-087 | Prevent HR double submits | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Backdated from HR review fixes. |
| US-OLV-088 | Surface Supabase write errors | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Important because supabase-js v2 does not throw automatically. |
| US-OLV-089 | Browse SDR workspace | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Initial SDR route was added with HR/CRM hub completion and refined later. |
| US-OLV-090 | Inspect SDR overview | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Exact visual metrics should be manually verified. |
| US-OLV-091 | Filter SDR prospects | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Prospect edit depth depends on current SdrProspects implementation. |
| US-OLV-092 | Inspect SDR prospect detail | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Queued draft badge and refresh button were added later. |
| US-OLV-093 | Show queued SDR drafts badge | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Backdated from sdr/detail queued-drafts commit. |
| US-OLV-094 | Approve or reject SDR drafts | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Backend function now exists; production behavior still depends on deployed Supabase credentials and the current table schema. |
| US-OLV-095 | Review SDR outreach sends | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | No send mutation path was identified in current files. |
| US-OLV-096 | Edit SDR pipeline | In Progress | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Read and inspect paths are clear; full mutation coverage was hard to confirm from current files. |
| US-OLV-097 | Show CRM placeholder | Not Started | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | The placeholder exists; CRM feature implementation itself has not started. |
| US-OLV-098 | Register CRM Oliver config | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Useful shell behavior even though CRM itself is not implemented. |
| US-OLV-099 | Edit design token overrides | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Access to Admin depends on current auth/admin wiring. |
| US-OLV-100 | Apply runtime token overrides | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Requires Supabase design_tokens data. |
| US-OLV-101 | Browse design system reference | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Design system page grew across several token governance commits. |
| US-OLV-102 | Audit dead design tokens | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Implementation exists in page code; audit accuracy should be reviewed. |
| US-OLV-103 | Preview component library | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Accessible through Admin tab once admin routing is available. |
| US-OLV-104 | Store AI provider keys | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Function uses Supabase anon key per current implementation; admin gating should be verified. |
| US-OLV-105 | Call Anthropic with fallback key | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Inferred from _shared/ai.js usage and tech-debt state notes. |
| US-OLV-106 | Scan token drift | Code Present | Build/lint/typecheck | Strong | scripts/check-tokens.mjs; .github/workflows/ci.yml | CI also runs the scanner. |
| US-OLV-107 | Run build and typecheck | Code Present | Build/lint/typecheck | Strong | .github/workflows/ci.yml; package.json; next.config.ts | No unit test script is present. |
| US-OLV-108 | Pin Node runtime for builds | Code Present | Build/lint/typecheck | Strong | .github/workflows/ci.yml; package.json; next.config.ts | Backdated from build blocker fixes. |
| US-OLV-109 | Persist chat history schema | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | OliverDock now reads/writes through `/api/chat-messages`; live validation still depends on the updated schema being applied in Supabase. |
| US-OLV-110 | Handle page-aware AI chat | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | CRM has no contextPayload beyond static config. |
| US-OLV-111 | Refresh module data from Oliver | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Refresh behavior is callback-based per module. |
| US-OLV-112 | Open password security settings | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Named change-pw in command registries. |
| US-OLV-113 | Use responsive module shells | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Backdated from Apr 18 responsive audit commits. |
| US-OLV-114 | Constrain modal and popover layout | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Later portal dropdown work further refined account pickers. |
| US-OLV-115 | Lock HR page shell spacing | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Documented in locked.md and margin-scale.md. |
| US-OLV-116 | Standardize pill styling | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Pill sizing was adjusted across Apr 20 and Apr 22 commits. |
| US-OLV-117 | Maintain tech debt state docs | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | These docs can become stale and should be updated with code changes. |
| US-OLV-118 | Backfill user stories | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | This story describes the backfill artifact itself. |
| US-OLV-119 | Import HR candidate lists with AI intake | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Tabular files are parsed client-side; image uploads still depend on configured AI provider access. |
| US-OLV-120 | Copy operational values to clipboard | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Clipboard behavior is present in several components but has limited user-visible failure feedback. |
| US-OLV-121 | Handle token override load failures | Code Present | Manual review | Weak | Story acceptance criteria plus source/manual review path in _traceability-matrix.md | Failure path is console-only; there is no in-app alert for token override load failures. |
| US-OLV-122 | Maintain browser regression smoke suite | Code Present | Browser smoke | Strong | tests/e2e/frontend-smoke.spec.ts; playwright.config.ts | Verified locally on 2026-04-23 with 10 passing smoke tests. |
| US-OLV-123 | Preserve cross-page shell and heading consistency | Code Present | Browser smoke + manual review | Weak | tests/e2e/frontend-smoke.spec.ts; src/tech-debt/locked.md | Representative shell/heading checks exist, but not full visual regression coverage. |
| US-OLV-124 | Preserve primary navigation and action targets | Code Present | Browser smoke + manual review | Weak | tests/e2e/frontend-smoke.spec.ts | Top-level route/action coverage exists; destructive and deep action paths remain manual. |
| US-OLV-125 | Standardize interactive controls and placeholder states | Code Present | Browser smoke + manual review | Weak | tests/e2e/frontend-smoke.spec.ts | Pickers, modal opening, copy control, Design System component filter tabs, representative placeholder states, and role-restricted navigation are covered at smoke level. |
| US-OLV-126 | Document repeatable deep QA workflow | Code Present | Manual review | Weak | src/tech-debt/deep-qa-workflow.md; README.md | Process is now committed in-repo; its correctness still depends on keeping it current. |

## Strong Verification

These stories have a credible automated gate through CI build, TypeScript, or token scan. This is not equivalent to behavioral e2e coverage.

- US-OLV-001 Bootstrap app shell: .github/workflows/ci.yml; package.json; next.config.ts
- US-OLV-002 Configure static export: .github/workflows/ci.yml; package.json; next.config.ts
- US-OLV-004 Load shared design tokens: scripts/check-tokens.mjs; .github/workflows/ci.yml
- US-OLV-106 Scan token drift: scripts/check-tokens.mjs; .github/workflows/ci.yml
- US-OLV-107 Run build and typecheck: .github/workflows/ci.yml; package.json; next.config.ts
- US-OLV-108 Pin Node runtime for builds: .github/workflows/ci.yml; package.json; next.config.ts
- US-OLV-122 Maintain browser regression smoke suite: tests/e2e/frontend-smoke.spec.ts; playwright.config.ts

## Weak Verification

These stories can currently be checked only by manual review/manual browser validation or inferred source inspection. They do not have dedicated tests.

- US-OLV-003 Wire Supabase browser client: Manual review.
- US-OLV-005 Document staging workflow: Manual review.
- US-OLV-006 Provide Microsoft login: Manual review.
- US-OLV-007 Preserve auth session: Manual review.
- US-OLV-008 Guard private routes: Manual review.
- US-OLV-009 Model app users: Manual review.
- US-OLV-013 Proxy app user CRUD: Manual review.
- US-OLV-014 Enforce app users RLS: Manual review.
- US-OLV-015 Show module directory: Manual review.
- US-OLV-016 Render module cards: Manual review.
- US-OLV-017 Show hub session controls: Manual review.
- US-OLV-018 Serve accounts route: Manual review.
- US-OLV-019 Browse account portfolio: Manual review.
- US-OLV-020 Group account cards by tier: Manual review.
- US-OLV-021 Edit account client company on card: Manual review.
- US-OLV-022 Open account detail: Manual review.
- US-OLV-023 Edit account overview: Manual review.
- US-OLV-024 Edit account name in topbar: Manual review.
- US-OLV-025 Archive and unarchive accounts: Manual review.
- US-OLV-026 Delete accounts cascade: Manual review.
- US-OLV-027 Navigate account sidebar: Manual review.
- US-OLV-028 Show shared topbar: Manual review.
- US-OLV-029 Filter account workspace: Manual review.
- US-OLV-030 Manage account stakeholders: Manual review.
- US-OLV-031 Visualize org chart: Manual review.
- US-OLV-032 Prevent invalid reporting loops: Manual review.
- US-OLV-033 Manage account actions: Manual review.
- US-OLV-034 Track account opportunities: Manual review.
- US-OLV-035 Promote opportunity to project: Manual review.
- US-OLV-036 Track account projects: Manual review.
- US-OLV-037 Move project to opportunity: Manual review.
- US-OLV-038 Capture account notes: Manual review.
- US-OLV-039 Manage note attendees: Manual review.
- US-OLV-040 Export account data: Manual review.
- US-OLV-041 Choose export note scope: Manual review.
- US-OLV-042 Add new accounts: Manual review.
- US-OLV-043 Use custom pickers: Manual review.
- US-OLV-044 Support picker portals: Manual review.
- US-OLV-045 Confirm destructive actions: Manual review.
- US-OLV-046 Undo soft deletes: Manual review.
- US-OLV-047 Sync account data: Manual review.
- US-OLV-048 Recover from AccountView crash: Manual review.
- US-OLV-049 Parse local transcripts: Manual review.
- US-OLV-050 Parse uploaded documents: Manual review.
- US-OLV-051 Parse org chart images: Manual review.
- US-OLV-052 Review parsed transcripts: Manual review.
- US-OLV-053 Detect import conflicts: Manual review.
- US-OLV-054 Commit imported account data: Manual review.
- US-OLV-055 Handle import write failure: Manual review.
- US-OLV-056 Answer contextual chat: Manual review.
- US-OLV-057 Handle chat provider failures: Manual review.
- US-OLV-058 Open OliverDock: Manual review.
- US-OLV-059 Capture voice input: Manual review.
- US-OLV-060 Export Oliver conversation: Manual review.
- US-OLV-061 Reset Oliver conversation: Manual review.
- US-OLV-062 Show quick command chips: Manual review.
- US-OLV-063 Suggest fuzzy commands: Manual review.
- US-OLV-064 Run Oliver step flows: Manual review.
- US-OLV-065 Run accounts chat flows: Manual review.
- US-OLV-066 Run HR chat flows: Manual review.
- US-OLV-067 Run SDR chat flows: Manual review.
- US-OLV-068 Browse HR dashboard: Manual review.
- US-OLV-069 Navigate HR sections: Manual review.
- US-OLV-070 Search HR records globally: Manual review.
- US-OLV-071 Quick add HR records: Manual review.
- US-OLV-072 Manage hiring pipeline: Manual review.
- US-OLV-073 Promote candidate to employee: Manual review.
- US-OLV-074 Upload HR source files: Manual review.
- US-OLV-075 Parse receipt uploads: Manual review.
- US-OLV-076 Manage employee directory: Manual review.
- US-OLV-077 Start employee offboarding: Manual review.
- US-OLV-078 Manage onboarding runs: Manual review.
- US-OLV-079 Manage device inventory: Manual review.
- US-OLV-080 Assign devices: Manual review.
- US-OLV-081 Return devices: Manual review.
- US-OLV-082 Browse device assignments: Manual review.
- US-OLV-083 Manage HR tracks and tasks: Manual review.
- US-OLV-084 View HR reports: Manual review.
- US-OLV-085 Configure HR settings: Manual review.
- US-OLV-086 Run HR modal step flows: Manual review.
- US-OLV-087 Prevent HR double submits: Manual review.
- US-OLV-088 Surface Supabase write errors: Manual review.
- US-OLV-089 Browse SDR workspace: Manual review.
- US-OLV-090 Inspect SDR overview: Manual review.
- US-OLV-091 Filter SDR prospects: Manual review.
- US-OLV-092 Inspect SDR prospect detail: Manual review.
- US-OLV-093 Show queued SDR drafts badge: Manual review.
- US-OLV-095 Review SDR outreach sends: Manual review.
- US-OLV-096 Edit SDR pipeline: Manual review.
- US-OLV-097 Show CRM placeholder: Manual review.
- US-OLV-098 Register CRM Oliver config: Manual review.
- US-OLV-099 Edit design token overrides: Manual review.
- US-OLV-100 Apply runtime token overrides: Manual review.
- US-OLV-101 Browse design system reference: Manual review.
- US-OLV-102 Audit dead design tokens: Manual review.
- US-OLV-103 Preview component library: Manual review.
- US-OLV-104 Store AI provider keys: Manual review.
- US-OLV-105 Call Anthropic with fallback key: Manual review.
- US-OLV-110 Handle page-aware AI chat: Manual review.
- US-OLV-111 Refresh module data from Oliver: Manual review.
- US-OLV-112 Open password security settings: Manual review.
- US-OLV-113 Use responsive module shells: Manual review.
- US-OLV-114 Constrain modal and popover layout: Manual review.
- US-OLV-115 Lock HR page shell spacing: Manual review.
- US-OLV-116 Standardize pill styling: Manual review.
- US-OLV-117 Maintain tech debt state docs: Manual review.
- US-OLV-118 Backfill user stories: Manual review.
- US-OLV-120 Copy operational values to clipboard: Manual review.
- US-OLV-121 Handle token override load failures: Manual review.
- US-OLV-123 Preserve cross-page shell and heading consistency: Browser smoke + manual review.
- US-OLV-124 Preserve primary navigation and action targets: Browser smoke + manual review.
- US-OLV-125 Standardize interactive controls and placeholder states: Browser smoke + manual review.
- US-OLV-126 Document repeatable deep QA workflow: Manual review.

## No Verification Path

No stories currently remain in the "no meaningful verification path" bucket after the latest code pass, but many still require manual or environment-backed validation.

## Missing High-Risk Verification

- Auth and permissions: MSAL login/session/guard behavior has no e2e test, and permission/admin stories now depend on live `app_users` resolution through `/api/users`.
- Input validation: chat-messages, parse-document, parse-image, confirm-write, users, and admin keys endpoints have no API contract tests for invalid JSON, missing fields, size limits, unsupported media types, and service-role/env failures.
- Config/secrets assumptions: Azure env, Supabase public env, Supabase service role, Anthropic ai_config, fallback key, and ANTHROPIC_API_KEY are not covered by runtime config tests.
- Error/retry paths: Anthropic fallback retry, OliverDock network errors, token override load failures, Supabase write failures, soft-delete expiry failures, and clipboard failures lack automated assertions.
- Loading/empty/fallback states: Accounts, HR, SDR, design-system, CRM placeholder, empty module list, and no-data tables are mostly manual-only.
- Imports/exports: account transcript/document/image import, conflict dry-run, commit-write side effects, ExportPanel print blob, Oliver conversation export, HR Candidate Intake, and receipt parsing have no automated tests.
- Slides module: parser smoke exists, but there are no integration tests yet for persisted slide CRUD, template library flows, autosave, export pipeline, or conflict recovery.
- Syncs and data mutation side effects: account cascade delete, opportunity/project promotion, HR offboarding run creation, device assignment/return, candidate promotion/rejection, SDR prospect edits, and token override writes are manual-only.
- Webhooks/background jobs: none implemented; absence is documented but not enforced by tests.
- Edge inputs: large documents, malformed AI JSON, circular org relationships, duplicate imports, missing Supabase rows, and unsupported browser APIs are not covered by automated tests.

## Recommended Next Tests

1. Extend the existing Playwright smoke suite to cover login guard redirects, more destructive/confirm flows, and env-backed permission behavior on staging.
2. Add API contract tests for Cloudflare functions: /api/chat, /api/parse-document, /api/parse-image, /api/confirm-write, /api/users, and /api/admin/keys with valid and invalid payloads.
3. Add unit tests for transcript-parser, receipt-parser, fuzzy scoring, check-tokens, dbWrite/dbWriteMulti, and conflict detection/write summary logic extracted from confirm-write.
4. Add mutation integration tests with mocked Supabase for account cascade delete, opportunity/project promotion, HR quick-add rollback, device assignment/return, candidate stage changes, token overrides, and app_users service-role proxy.
5. Add e2e import/export tests for account transcript import review/dry-run/commit, org-chart image rejection paths, ExportPanel print blob creation, Oliver conversation export, and HR Candidate Intake.
6. Add browser capability tests/mocks for SpeechRecognition unsupported state and clipboard success/failure states.
7. Add a lint/test guard for story support files so audit docs do not conflict with prompt-lint story-file validation.
