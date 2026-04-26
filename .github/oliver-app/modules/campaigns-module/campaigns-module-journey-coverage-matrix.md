# Campaigns Journey Coverage Matrix (2026-04-26)

Purpose: make every Campaigns click path explicit, measurable, and testable so backlog execution can close functional and UX gaps with low regression risk.

## Route Surface Inventory

- `/campaigns/campaigns` Campaign list/detail shell
- `/campaigns/content` Content library and drafting
- `/campaigns/review-queue` Review workflow operations
- `/campaigns/calendar` Claimed schedule operations
- `/campaigns/reminders` Reminder operations
- `/campaigns/reports` Reporting and export workflows
- `/campaigns/automation` Journey/planning/focus/segment surfaces

## Critical Journey Matrix

| Journey ID | Entry Point | Target Outcome | Primary Path | Click Budget | Current Gap | Backlog Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| `CMP-J01` | Hub card -> Campaigns | Create campaign and save draft | Hub -> Campaigns -> Add Campaign -> Save | <=5 | Missing route-level click-budget gate | `US-CMP-QA-1946`, `US-CMP-FE-1947` |
| `CMP-J02` | Sidebar `Content` | Create content draft | Content -> Add Draft -> Save Draft | <=4 | Incomplete keyboard-first path certification | `US-CMP-FE-1947`, `US-CMP-QA-1955` |
| `CMP-J03` | Chatbot typed intent | Submit draft for review | Open Oliver -> intent match -> guided flow -> submit | <=6 | Fuzzy ambiguity prompts/telemetry incomplete | `US-CMP-CHAT-1948`, `US-CMP-CHAT-1949` |
| `CMP-J04` | Review queue card action | Approve content | Review queue -> item -> Approve | <=3 | Cross-role denial and reason-copy parity drift risk | `US-CMP-QA-1946`, `US-CMP-FE-1950` |
| `CMP-J05` | Content library card action | Claim and schedule | Content library -> Claim -> schedule -> save | <=4 | Mobile touch-target + modal overlap checks incomplete | `US-CMP-QA-1951`, `US-CMP-QA-1955` |
| `CMP-J06` | Calendar row action | Mark as posted + URL | Calendar -> item -> Mark posted -> URL save | <=4 | Provenance/confidence of downstream reporting not visible | `US-CMP-FE-1944`, `US-CMP-FE-1952` |
| `CMP-J07` | Reminders workspace | Create/resolve reminder | Reminders -> add/update reminder | <=4 | Reminder-to-content deep-link consistency not fully certified | `US-CMP-QA-1946`, `US-CMP-QA-1951` |
| `CMP-J08` | Reports dashboard card | Drill down to filtered queue | Reports -> card -> filtered view | <=3 | Metric definition and drilldown metadata inconsistent | `US-CMP-FE-1952`, `US-CMP-BE-1953` |
| `CMP-J09` | Automation route | Build and publish journey graph | Automation -> canvas edit -> publish | <=6 | Source ledger and evidence traceability incomplete | `US-CMP-BE-1943`, `US-CMP-QA-1945` |
| `CMP-J10` | Automation route | Build segment and persist clone/archive | Automation -> segment builder -> save/clone/archive | <=5 | Scheduled evaluator and readiness diagnostics pending | `US-CMP-BE-1910`, `US-CMP-QA-1945` |
| `CMP-J11` | Chatbot quick command | Open exact route/filter context | Open Oliver -> quick action -> route transition | <=2 | Alias breadth expanded; confidence gates still pending | `US-CMP-CHAT-1948` |
| `CMP-J12` | Direct URL + no schema | Operator recovery from migration miss | Open route -> schema banner -> migration guidance | <=2 | Guidance was file-specific and now generalized; needs docs parity | `SMK-CMP-008`, `US-CMP-QA-1946` |

## Cross-Module Parity Checks

| Parity ID | Comparison | Requirement | Backlog Coverage |
| --- | --- | --- | --- |
| `CMP-P01` | Campaign shell vs Reviews shell | Header/sidebar/banner/action rail structural parity | `US-CMP-FE-1950` |
| `CMP-P02` | Campaign tokens vs global design system | Semantic tokens only, no local hardcoded drift | `US-CMP-FE-1940`, `US-CMP-QA-1941` |
| `CMP-P03` | Campaign chatbot vs module chatbot baseline | Consistent fuzzy routing guardrails + prompt style | `US-CMP-CHAT-1948`, `US-CMP-CHAT-1949` |
| `CMP-P04` | Mobile breakpoints across modules | No overflow/clipping on comparable route surfaces | `US-CMP-QA-1951`, `US-CMP-QA-1955` |

## Data Mapping and Visualization Controls

- Metric and source metadata must flow from API to UI without hardcoded assumptions (`US-CMP-BE-1953`, `US-CMP-FE-1952`).
- Automation/report trust indicators must always include freshness, coverage, and confidence (`US-CMP-FE-1944`).
- Ingestion lineage must be queryable and exportable end-to-end (`US-CMP-BE-1942`, `US-CMP-BE-1943`, `US-CMP-QA-1945`).

## Execution Order (next)

1. Complete `CMP-E15A` hardening (segment evaluator + operator diagnostics + persistence consistency).
2. Execute `CMP-E19A` to normalize ingestion and lineage contracts.
3. Execute `CMP-E20B` to close chatbot fuzzy/validation gaps.
4. Execute `CMP-E18A` + `CMP-E20C` for design mapping and parity migration.
5. Execute `CMP-E21A` for metric semantics and high-trust data visualization.
