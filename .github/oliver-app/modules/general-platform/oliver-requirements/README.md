# Oliver Requirements Backlog (2026-04-24)

Scope: `oliver-app` only (`/Users/oliver/projects/oliver-app`)  
Purpose: capture validated net-new work without duplicating already-shipped stories.

## Validated Existing Coverage

- Cross-page spacing consistency is already covered by:
  - `US-OLV-115` (HR page shell spacing)
  - `US-OLV-123` (cross-page shell + heading consistency)
- These were not duplicated here.

## Net-New / Changed Direction Stories

| ID | Title | Status | Supersedes / Refines |
| --- | --- | --- | --- |
| US-O8 | Inventory-Only Receipt Upload via HR Chatbot | Code Present | Refines `US-OLV-074`, `US-OLV-075` |
| US-O9 | Candidate Resume Versioning and File/Link Management | Code Present | Extends hiring candidate management |
| US-O10 | Account Strategy Naming Source of Truth (Page Header, Not Topbar) | Code Present | Supersedes `US-OLV-024`, `US-O3` |
| US-O11 | Route HR/SDR Chatbot Personal-Info Intents to Profile Page | Code Present | Supersedes `US-OLV-112` |
| US-O12 | Inventory Receipt Artifact Save, Download, Link, Delete | Code Present | Extends inventory workflows |
| US-O13 | Slide Import Warnings for Unsupported Units and Transform Features | Code Present | Extends Slide import QA/fidelity |
| US-O14 | Slide Import Canvas Normalization to 1920x1080 | Code Present | Extends `US-114` normalization intent |
| US-O15 | Slide Import Sanitization Hardening for Unsafe Markup | Code Present | Extends `US-112` security baseline |
| US-O16 | Slide Import Edge-Case Regression Coverage | Code Present | Extends `US-171` parser test coverage |
| US-O17 | Epic/Ticket Commit Grouping with Mandatory QA Gates | Code Present | New process governance requirement |

## Requirement To Story Traceability

| Requirement Theme | Story Coverage |
| --- | --- |
| Receipt upload must be inventory-only, not hiring | `US-O8` |
| Chatbot receipt parse should be client-side/no AI when possible | `US-O8` |
| Candidate resumes support multi-version upload + link + delete confirm + newest-first + download/open | `US-O9` |
| Resume versions visible in candidate edit + detail views | `US-O9` |
| Inventory receipts support save/download/direct link/delete confirm (including Best Buy receipts) | `US-O12` |
| Account Strategy topbar account name removed; in-page short/long names editable | `US-O10` |
| Chatbot profile/personal-info actions route to profile page instead of changing in-chat | `US-O11` |
| HR data export includes resume/receipt metadata as part of persisted records | `US-O9`, `US-O12` |

## QA Verification Evidence (2026-04-24)

- `npm run typecheck` passed
- `npm run lint` passed (`check-tokens` + `check-stories`)
- `npm run build` passed
- `npm run test:smoke` passed (24/24)
