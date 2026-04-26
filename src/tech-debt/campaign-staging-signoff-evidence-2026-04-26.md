# Campaign Staging Signoff Evidence Package

Date: 2026-04-26  
Scope: Campaign Content Posting module (`/campaigns`)

## Ticket Linkage

- US-CMP-QA-1114 (`CMP-QA-1114`)
- Rollout gate file: `src/tech-debt/campaign-rollout-and-dod-gates.md`
- Primary QA backlog: `/.github/oliver-app/modules/campaigns-module/US-CMP-QA-1114-staging-signoff-evidence-package.md`

## Environment

- Environment target: `staging`
- Staging URL: `https://oliver-app-staging...` (fill in)
- Actor(s): `TBD`
- Date/Time: `TBD`
- Run owner: `TBD`

## Execution Notes

- 2026-04-26: Module implementation and automation wiring are in-code complete; pending only external/manual staging validations:
  - staging campaign suite and mobile clickpath execution,
  - `/api/campaigns` duplicate-export / fallback matrix,
  - campaign jobs dry-run/live verification,
  - module visibility flag matrix.
- Pending tasks must be executed against a staging build with seeded campaign dataset and at least one admin + one reviewer/editor actor.

## Required Suite Execution

| Suite | Command | Status | Result summary | Evidence artifact |
| --- | --- | --- | --- | --- |
| Campaign e2e | `npm run test:smoke:campaigns` | `BLOCKED` | `Awaiting staging environment signoff credentials and seed window` | `TBD` |
| Campaign smoke slice | `npm run test:smoke:campaigns:frontend` with staging API endpoint config | `BLOCKED` | `Awaiting staging environment signoff credentials and seed window` | `TBD` |
| Frontend smoke (campaign cases) | `npm run test:smoke:campaigns:frontend` | `BLOCKED` | `Awaiting staging environment signoff credentials and seed window` | `TBD` |
| Mobile clickpaths | `npm run test:smoke:campaigns:mobile` | `BLOCKED` | `Awaiting staging environment signoff credentials and seed window` | `TBD` |

## Local execution log

- 2026-04-26T02:54:14Z: `npm run test:smoke -- tests/e2e/campaigns-module.spec.ts` -> blocked by local webServer bind to `0.0.0.0:3001`.
- 2026-04-26T02:54:27Z: `npm run test:smoke -- tests/e2e/frontend-smoke.spec.ts` -> blocked by local webServer bind to `0.0.0.0:3001`.
- 2026-04-26T02:54:35Z: `npm run test:smoke:mobile -- tests/e2e/mobile-clickpaths.spec.ts` -> blocked by local webServer bind to `0.0.0.0:3001`.
- 2026-04-26: Added staging execution matrix for pinned Playwright port (`:3002`) and staged all pending manual checks in this evidence file.
- 2026-04-26T10:48:12Z: `npm run test:smoke:campaigns` -> blocked by local sandbox; Playwright webServer failed with `EPERM listen 0.0.0.0:3002`.
- 2026-04-26T10:54:22Z: `npm run test:contracts -- tests/contracts/campaign-ics.contract.test.mjs tests/contracts/campaigns-api.contract.test.mjs` -> passed (`13 passed, 0 failed`) and captured as local contract evidence.

## Campaign API / Job Execution Checklist

| Workflow | Command/Test | Status | Notes |
| --- | --- | --- | --- |
| `/api/campaigns` export idempotency dry-run/live | Manual staging capture using signed-in admin | `BLOCKED` | `Seeded staging + admin actor required` |
| `campaign_jobs` dry-run and live modes | Manual staging capture using signed-in admin | `BLOCKED` | `Seeded staging + admin actor required` |
| Permission/gating matrix | Admin/editor/reviewer role smoke checks | `BLOCKED` | `Seeded staging + role coverage required` |
| Module visibility flag parity | `NEXT_PUBLIC_DISABLED_MODULES=campaigns`, `NEXT_PUBLIC_ENABLED_MODULES=campaigns`, `NEXT_PUBLIC_HUB_VISIBLE_MODULES=campaigns` | `BLOCKED` | `Requires environment parity window` |
| ICS import check | macOS Calendar import (`.ics`) and Windows Outlook import (`.ics`) | `BLOCKED` | `Requires desktop QA environments and screenshots` |

## Staging Rollout Checkboxes (Signed Off)

- [ ] Campaign e2e suite executed and artifacts captured.
- [ ] `/api/campaigns` duplicate export and fallback matrix validated.
- [ ] `campaign_jobs` dry-run/live validated under actor constraints.
- [ ] Permission matrix validated and recorded.
- [ ] Module visibility flags validated and documented.
- [ ] ICS import evidence captured for macOS Calendar and Windows Outlook (`.ics` payload preservation + screenshots).
- [ ] Manual ICS import evidence recorded in `US-CMP-1112` / `US-CMP-1113`.
- [ ] Rollout blocker lifted in `campaign-rollout-and-dod-gates.md`.

## Signature

- Release Owner: `TBD`
- Verified at: `TBD`
- Artifact location(s): `TBD`

## Local-only verification evidence

- `npm run test:contracts -- tests/contracts/campaign-ics.contract.test.mjs tests/contracts/campaigns-api.contract.test.mjs`
  - status: passed
  - artifacts: command output only (`13 passed, 0 failed`)
  - timestamp: `2026-04-26T10:54:22Z`
  - relevance: supports `US-CMP-QA-1113` contract assertions and `US-CMP-QA-1114` readiness evidence (non-staging scope).

## Current Blocker Log

- Active release blocker: `US-CMP-QA-1111` is waiting for complete `US-CMP-QA-1114` signoff completion.
- Active release blocker: `US-CMP-QA-1112` is waiting on `US-CMP-QA-1113` ICS external client evidence.
- Active release blocker: `US-CMP-QA-1115` is waiting on signed campaign suite artifacts (mobile/shell assertions).
