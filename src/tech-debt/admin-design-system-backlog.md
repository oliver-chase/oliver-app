# Admin + Design System Backlog

Date: 2026-04-25  
Scope: Admin workspace, Design System workspace, `/api/users` identity/auth flows, token usage tracking, and cross-module style consistency.

## Current Signals

1. Admin save flow is returning `401 Unauthorized request. Missing verified actor identity.` from `/api/users` in production for owner/admin users.
2. Design System page reports large sets of "tokens with no tracked usage", which is currently ambiguous (true-unused vs not-catalogued).
3. Cross-system style consistency still needs an explicit audit gate for shared components and spacing hierarchy.

## EPIC ADDS-E1: Identity + Admin Reliability
Goal: Make Admin save/update flows reliable for authorized owner/admin users in all environments.
KPI: Admin save success rate >= 99.5% with zero false 401s for verified owner/admin identities.

| Ticket | Title | Layer | Priority | Status | User Story | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| ADDS-BE-110 | `/api/users` identity fallback parity for trusted app actor | Backend | P0 | Backlog | As an admin user, I want Admin save actions to work even when CF Access headers are absent but trusted actor identity is supplied, so I can manage users without hard auth dead-ends. | 1) Owner/admin identity is resolved from either CF Access headers or trusted actor payload/headers per env policy. 2) `kiana.micari@vtwo.co` (and configured owners) can complete save/update flows without 401 in production. 3) Unauthorized requests still return 401/403 correctly for non-admin users. 4) Contract tests cover header-present and trusted-fallback paths. |
| ADDS-FE-110 | Admin identity preflight + actionable error UX | Frontend | P1 | Backlog | As an admin user, I want clear preflight validation and actionable errors before save attempts, so I can recover quickly from identity/config issues. | 1) Admin page blocks save when actor identity is incomplete and shows targeted remediation copy. 2) 401/403 responses render role-aware guidance (not generic failure). 3) Retry path performs a fresh user-context reload before re-posting. 4) E2E validates owner/admin save success and non-admin denial path. |

## EPIC ADDS-E2: Dynamic Design System Data
Goal: Ensure Design System page reflects live, trustworthy usage and structure (matching Tesknota behavior where required).
KPI: Token usage panel has deterministic, explainable counts and <2% false "unused" flags in seeded audits.

| Ticket | Title | Layer | Priority | Status | User Story | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| ADDS-BE-210 | Token usage indexer + catalog freshness metadata | Backend | P1 | Backlog | As a design-system admin, I want token usage data to be computed from an indexed source with freshness metadata, so I can trust unused-token flags before deleting anything. | 1) Usage data source records last-indexed timestamp and source coverage. 2) API returns `tracked`, `untracked`, and `unknown` states instead of only "unused". 3) Missing catalog coverage is distinguishable from true zero usage. 4) Background re-index job is idempotent and observable in logs/metrics. |
| ADDS-FE-210 | Design System "usage confidence" UX and filters | Frontend | P1 | Backlog | As a design-system admin, I want usage warnings grouped by confidence level, so I can prioritize safe cleanup actions. | 1) "Tokens with no tracked usage" is split into clear categories (`Unused`, `Not Catalogued Yet`, `Pending Reindex`). 2) Filters allow viewing each category independently. 3) Rows expose last-indexed timestamp + grep guidance inline. 4) UI never implies safe deletion when confidence is low. |
| ADDS-FE-220 | Tesknota parity pass for dynamic DS structure | Frontend | P2 | Backlog | As an admin, I want the Design System page structure and dynamic behavior to mirror Tesknota patterns, so workflows are consistent across systems. | 1) Header, filter bar behavior, section ordering, and data grouping match agreed Tesknota parity map. 2) Top filter bar persists while navigating/editing subsections. 3) Edit interactions match existing Tesknota DS edit affordances. 4) Parity checklist is attached to PR and signed off. |

## EPIC ADDS-E3: Component Style Compliance
Goal: Enforce consistent component-system usage across Admin and hub-adjacent surfaces.
KPI: Zero P0/P1 token/style regressions across Admin + Design System pages in release QA.

| Ticket | Title | Layer | Priority | Status | User Story | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| ADDS-FE-310 | Admin + Design System component conformance audit | Frontend | P1 | Backlog | As a product owner, I want Admin and Design System pages to consistently use shared component styles, so UI behavior and spacing are predictable across modules. | 1) Audit inventory maps each Admin/DS UI block to approved shared component primitives. 2) Any local one-off styling is either removed or documented with exception rationale. 3) Spacing/margin hierarchy aligns with component structure rules and token scale. 4) Visual QA before/after screenshots are captured for desktop + mobile. |
| ADDS-QA-310 | E2E style/flow regression pack (Admin + DS + Chatbot path) | QA | P1 | Backlog | As a release manager, I want end-to-end coverage for Admin/Design System flows (including chatbot entry points), so style and flow regressions are caught before deployment. | 1) E2E covers: admin save/update, DS filter persistence, DS edit flow, token usage panel rendering, chatbot path into admin/DS actions. 2) Failures include actionable selector-level diagnostics. 3) Smoke pack runs in CI on staging promotion gates. 4) Release checklist requires green run before merge to main. |

## Next Up (Recommended Order)

1. ADDS-BE-110 + ADDS-FE-110 (fix the live 401 blocker first).
2. ADDS-BE-210 + ADDS-FE-210 (make token usage data trustworthy).
3. ADDS-FE-220 (Tesknota dynamic structure parity).
4. ADDS-FE-310 + ADDS-QA-310 (lock style and E2E quality gates).

## Prioritization Framework

Use this rubric for every backlog grooming pass:

| Dimension | Weight | Scoring Rule (1-5) |
| --- | --- | --- |
| User impact | 35% | 1 = minor inconvenience, 5 = blocks critical workflow |
| Business risk | 25% | 1 = low consequence, 5 = compliance/revenue/trust risk |
| Frequency | 15% | 1 = rare edge case, 5 = daily/high-volume path |
| Dependency unlock | 15% | 1 = isolated, 5 = unblocks multiple roadmap items |
| Delivery effort (inverse) | 10% | 1 = very large, 5 = small/contained |

Priority bands:

| Band | Rule | Delivery expectation |
| --- | --- | --- |
| P0 | weighted score >= 4.2 OR production workflow blocker | next sprint / hot-path queue |
| P1 | weighted score 3.5-4.19 | next 1-2 sprints |
| P2 | weighted score 2.7-3.49 | planned after P0/P1 completion |
| P3 | weighted score < 2.7 | scheduled when capacity allows |

## Ranked Queue (Current)

| Rank | Ticket | Current Band | Why now |
| --- | --- | --- | --- |
| 1 | ADDS-BE-110 | P0 | Admin owner save path intermittently hard-fails with unauthorized identity state. |
| 2 | ADDS-FE-110 | P1 | Converts backend auth outcomes into recoverable, actionable admin UX. |
| 3 | ADDS-BE-210 | P1 | Token usage signal must be trustworthy before cleanup/deletion decisions. |
| 4 | ADDS-FE-210 | P1 | Removes ambiguity in "unused token" UI and reduces false cleanup risk. |
| 5 | ADDS-FE-220 | P2 | Delivers structure/dynamic parity with Tesknota workflows. |
| 6 | ADDS-FE-310 | P1 | Enforces shared component mapping and no hardcoded style drift. |
| 7 | ADDS-QA-310 | P1 | Makes quality gate repeatable across Admin/DS/chatbot journeys. |
