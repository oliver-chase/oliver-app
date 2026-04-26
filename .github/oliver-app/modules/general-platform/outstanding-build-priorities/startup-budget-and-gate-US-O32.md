# US-O32 Startup Budget and CI Gate (2026-04-26)

## Budget Thresholds (ms)

| Metric | P50 Budget | P95 Budget | Source |
| --- | ---: | ---: | --- |
| `auth_bootstrap_ms` | 900 | 1800 | `src/lib/startup-telemetry.ts` |
| `user_fetch_ms` | 800 | 1800 | `src/lib/startup-telemetry.ts` |
| `permission_filter_ms` | 40 | 120 | `src/lib/startup-telemetry.ts` |
| `hub_interactive_ms` | 2500 | 4000 | `src/lib/startup-telemetry.ts` |

## Capture Points

- Auth bootstrap timing recorded in `AuthProvider` after MSAL/bypass initialization.
- User bootstrap timing recorded in `UserProvider` for both bypass and API-backed paths.
- Permission filter timing recorded in Hub module-filter stage.
- Hub interactive timing recorded on first non-loading hub render.

## Regression Gate

- CI/Smoke gate assertion:
  - `tests/e2e/frontend-smoke.spec.ts`
  - test name: `hub startup telemetry records budgeted auth and permission warm-path timings`
- Gate behavior:
  - Reads `window.__oliverStartupTelemetry` summary.
  - Requires non-zero sample counts for all four startup metrics.
  - Fails when any metric breaches its configured P50/P95 budget (`pass !== true`).

## Warm-Path Controls

- `UserProvider` now de-duplicates in-flight permission/user bootstrap for identical identity keys.
- `UserProvider` adds 60-second warm cache to avoid redundant startup fetches on initial refresh loops.
- Hub loading copy now differentiates auth bootstrap (`Checking sign-in…`) and permission warm path (`Loading permissions…`).
