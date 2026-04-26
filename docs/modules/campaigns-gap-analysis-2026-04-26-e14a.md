# Campaigns E14A Gap Analysis (2026-04-26)

Scope: `CMP-E14A` journey canvas + execution timeline implementation and regression profile.

## Coverage achieved
- Journey canvas section shipped at `/campaigns/automation` with node types `action|decision|condition`.
- Graph publish includes validation for dangling references, prohibited cycles, and required per-type config keys.
- Publish writes audit activity with version transition metadata.
- Timeline supports date/node-type/branch filtering and entry-to-node highlight.
- Timeline export uses existing `campaign_report_exports` path (`csv`, `json`).
- Contract tests added for timeline query/export actions.
- E2E coverage added for automation route navigation and timeline request path.

## Gaps and residual risk
1. Full campaign E2E suite had intermittent local webserver instability (`ERR_CONNECTION_REFUSED`) mid-run; targeted automation tests passed.
2. Journey publish path currently lacks direct contract test coverage for malformed graph payloads and permission-denied responses.
3. Timeline freshness/coverage metadata is basic (`generatedAt`) and does not yet include confidence/source completeness.
4. Journey node editor currently uses free-form JSON textarea; no structured per-type field UI constraints.
5. Read-only mode is enforced in UI, but there is no dedicated API action for graph publish in Cloudflare endpoint yet; current publish path uses Supabase client + existing access controls.

## Required follow-up backlog items
- `US-CMP-QA-1905` certify regression and policy safety gates.
- `US-CMP-ARCH-1906` schema contract hardening and rollback safety.

## Immediate mitigation plan
1. Add publish-path contract tests for permission + validation envelopes.
2. Expand automation E2E with read-only mode assertions and publish validation failure assertions.
3. Introduce structured config editors by node type to reduce JSON-shape errors.
4. Add richer timeline metadata (`coverage`, `confidence`, `freshness`) in API response and UI.
