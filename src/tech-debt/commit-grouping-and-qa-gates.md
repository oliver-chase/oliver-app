# Commit Grouping and QA Gates

Use this policy when shipping work that spans multiple stories or modules.

## 1. Group commits by epic/ticket slices

Each commit should represent one coherent slice and must reference story IDs.

Commit subject format:

```text
<type>(<area>): <scope summary> [US-XXX, US-YYY]
```

Examples:

```text
feat(hr): inventory-only receipt upload + artifact controls [US-O8, US-O12]
fix(accounts): move account short-name edit to page header [US-O10]
```

Commit body minimum:

```text
Stories: US-O8, US-O12
Scope: Inventory receipt upload flow + device receipt artifact lifecycle
Modules: src/app/hr/page.tsx, src/components/hr/HrInventory.tsx, src/lib/hr-assets.ts
QA: typecheck=pass; lint=pass; build=pass; smoke=pass (24/24)
```

## 2. Mandatory QA gates per grouped commit

Before pushing grouped commits, run:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:smoke
```

Record pass/fail in commit body and PR description.

## 3. PR traceability requirements

Every PR must include:

- epic/ticket grouping summary
- story IDs covered by each commit group
- touched modules per group
- QA gate evidence

Use `.github/pull_request_template.md` for the required format.

## 4. Release traceability file

Update `src/tech-debt/release-traceability.md` before merge with:

- commit hash
- epic/group label
- covered story IDs
- modules touched
- QA gate outcomes

This keeps release notes and story mapping auditable without reading entire diffs.
