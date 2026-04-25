# Commit Grouping and QA Gates

Use this policy when shipping work that spans multiple stories or modules.

## 1. Epic ownership is mandatory

New work must be committed as one of:

- a full epic milestone commit, or
- an incremental commit that clearly belongs to an existing epic.

Do not mix unrelated epics in one commit.

If work touches multiple epics, split by epic into separate commits (or separate branches).

## 2. Commit format for epic/ticket slices

Each commit must reference both:

- epic scope
- story IDs covered by the commit

Commit subject format (epic-first):

```text
<type>(epic-<epic-slug>): <scope summary>
```

Examples:

```text
feat(epic-slides-core-editing): add canvas drag/nudge controls
fix(epic-account-export-contracts): harden export retry handoff
```

Commit body minimum:

```text
Epic: epic-slides-core-editing
Stories: US-SLD-020, US-SLD-021
Scope: Canvas renderer polish + drag/nudge controls
Modules: src/app/slides/page.tsx, src/app/slides/slides.css, tests/e2e/slides-regression.spec.ts
QA: typecheck=pass; lint=pass; build=pass; slides-regression=pass (10/10)
```

## 3. Mandatory QA gates per grouped commit

Before pushing grouped commits, run:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:smoke
```

Record pass/fail in commit body and PR description.

## 4. Recurring squash checkpoint (size control)

Run this checkpoint before push and before opening PR:

```bash
node scripts/check-epic-size.mjs
```

Default squash thresholds:

- more than `5` commits in branch since base ref
- more than `20` changed files
- more than `1200` changed LOC (`insertions + deletions`)

If any threshold is exceeded, squash to one clean epic commit before push.

Non-interactive squash flow:

```bash
BASE="$(git merge-base origin/staging HEAD)"
git reset --soft "$BASE"
git commit -m "feat(epic-<epic-slug>): <milestone summary>"
```

Then re-run QA gates and update traceability.

## 5. PR traceability requirements

Every PR must include:

- one owning epic
- story IDs covered by each commit group
- touched modules per group
- QA gate evidence

Use `.github/pull_request_template.md` for the required format.

## 6. Release traceability file

Update `src/tech-debt/release-traceability.md` before merge with:

- commit hash
- epic/group label
- covered story IDs
- modules touched
- QA gate outcomes

This keeps release notes and story mapping auditable without reading entire diffs.
