# Oliver App Git Workflow (Solo)

This repo uses a single integration branch and direct promotion without PRs.

## Branch Roles

- `main`: production-ready branch. Only tested, approved commits land here.
- `staging`: integration and validation branch.
- `feat/<module>-<topic>` or `fix/<module>-<topic>`: short-lived working branches.

## Daily Flow (No PRs)

1. Create a short-lived branch from `staging` for a focused change.
2. Commit and test locally.
3. Merge into `staging` (fast-forward or merge commit).
4. Validate on staging.
5. Promote to `main` by:
   - merging `staging` into `main` when staging is clean, or
   - cherry-picking specific approved commit(s) onto `main` when staging has mixed work.
6. Push `main`.

## Promotion Rule

If `staging` contains unrelated module changes, do not merge the whole branch into `main`.
Promote only explicit commit SHAs to keep releases scoped.

## Branch Hygiene

- Keep only long-lived: `main`, `staging`.
- Delete short-lived and backup branches once merged.
- Prefer annotated tags for recovery snapshots over long-lived backup branches.

## Naming

- Feature: `feat/slides-html-import-fidelity`
- Fix: `fix/slides-template-approvals-degraded-mode`
- Release helper (temporary): `promote/<scope>-<date>`

