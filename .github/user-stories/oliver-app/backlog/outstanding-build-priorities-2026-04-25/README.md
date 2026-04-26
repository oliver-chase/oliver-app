# Oliver Outstanding Build Priorities Backlog (2026-04-25)

Scope: continue build execution with productized backlog coverage (not incident-only fixes) across Hub/Admin/Design System/Slides.

Objective:
- Convert open UX and reliability friction into implementation-ready user stories.
- Prioritize by user-journey risk and release impact.
- Keep parity with shared component system and dynamic design-token architecture.

## Gap Analysis and Prioritized Story Map

| Gap Theme | User-Visible Symptom | Root Gap | Story Coverage | Priority |
| --- | --- | --- | --- | --- |
| Hub + component governance drift | Module/nav behavior diverges by page and surfaces bespoke styling | Missing enforcement for component-first architecture and token sourcing | `US-O25`, `US-O34` | P0 |
| Admin actor identity failures | Admin Dash save flow fails: `GET /api/users?...` -> `401 {"error":"Unauthorized request. Missing verified actor identity."}` | Authenticated actor identity not propagated/validated consistently for privileged APIs | `US-O26` | P0 |
| Design system trust gap | Design System reports `41`+ tokens with "no tracked usage" and no actionable confidence context | Usage catalog does not clearly separate truly unused vs not-yet-indexed tokens | `US-O27` | P1 |
| Template lifecycle incompleteness | Users can delete but cannot reliably undo/restore with confidence | No cross-module soft-delete + undo + restore pattern in Slides templates | `US-O28` | P1 |
| HTML import editing mismatch | Imported HTML does not remain visually faithful and fully editable | Parser/canvas mapping does not preserve enough structural semantics for component editing parity | `US-O29`, `US-O30` | P0 |
| Slides operational fragility | Cloudflare 1101/500 failures leak as full HTML errors in UI and break autosave flow | Missing hardened error envelope and client degraded-mode strategy | `US-O31` | P0 |
| App startup slowness | Hub feels slow or inconsistent on load/refresh | No formal startup performance budget and warm-path instrumentation | `US-O32` | P1 |
| End-to-end parity risk | Click paths/chatbot/backend contracts regress silently | Missing release-grade cross-module E2E certification protocol | `US-O33` | P0 |

## Suggested Delivery Waves

1. Wave 1 (P0 stability + trust): `US-O26`, `US-O29`, `US-O30`, `US-O31`, `US-O33`, `US-O25`
2. Wave 2 (P1 operational maturity): `US-O27`, `US-O28`, `US-O32`
3. Wave 3 (UX cleanup/parity hardening): `US-O34` plus any follow-on stories discovered during Wave 1/2 QA

## Ticket Slices

| Story | FE | BE | QA/Obs |
| --- | --- | --- | --- |
| `US-O25` | ARC-101 | ARC-102 | ARC-103 |
| `US-O26` | IDN-201 | IDN-202 | IDN-203 |
| `US-O27` | DS-301 | DS-302 | DS-303 |
| `US-O28` | SLD-701 | SLD-702 | SLD-703 |
| `US-O29` | SLD-710 | SLD-711 | SLD-712 |
| `US-O30` | SLD-720 | SLD-721 | SLD-722 |
| `US-O31` | SLD-730 | SLD-731 | SLD-732 |
| `US-O32` | PLT-801 | PLT-802 | PLT-803 |
| `US-O33` | QA-901 | QA-902 | QA-903 |
| `US-O34` | HUB-401 | HUB-402 | HUB-403 |

## Notes

- This bundle extends, but does not replace, existing bundles:
  - `slides-module-ux-be-backlog-2026-04-24`
  - `admin-design-system-parity-2026-04-25`
  - `auth-permissions-incident-backlog-2026-04-25.md`
- Theme colors should be governed through token/config sources, not module-level hardcoded values.
