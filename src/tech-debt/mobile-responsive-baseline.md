# Mobile Responsive Baseline (Cross-App)

Last updated: April 25, 2026

## Purpose

This document is the reference point for:

- what has already been completed for mobile responsiveness,
- what is still not complete,
- and the non-negotiable baseline for all future app work.

Scope includes:

- `oliver-app`
- `tesknota`
- any new app/module developed in this workspace.

## Baseline Policy (Effective Immediately)

Mobile responsiveness is a required baseline for all modules and shared system surfaces. It is not optional and not a follow-up task.

No PR is considered complete unless mobile behavior is production-usable for changed routes and click paths.

## What Is Done

### Oliver App

- Mobile smoke command exists and is runnable: `npm run test:smoke:mobile`.
- Combined desktop+mobile gate exists: `npm run test:smoke:all`.
- Mobile Playwright config exists (`playwright.mobile.config.ts`, Pixel 7 profile).
- Dedicated mobile click-path audit spec exists (`tests/e2e/mobile-clickpaths.spec.ts`).
- CI now runs desktop + mobile smoke in `.github/workflows/ci.yml`.
- README now states mobile-first baseline and required smoke coverage.
- Latest verified run in this session:
  - `npm run test:smoke` passed (82 tests).
  - `npm run test:smoke:mobile` passed (3 tests).
  - `npm run test:smoke:all` passed (desktop + mobile).

### Tesknota

- Combined seeded desktop+mobile gate exists: `npm run test:seeded-smoke:all`.
- CI now enforces desktop + mobile seeded smoke in `.github/workflows/quality.yml`.
- README and CONTRIBUTING now define mobile as mandatory.
- Latest verified run in this session:
  - `npm run test:seeded-smoke:mobile` passed (8 tests).
  - `npm run test:seeded-smoke:all` passed (desktop 8 + mobile 8).

## What Is Not Done Yet

- Full manual mobile UX remediation of every screen/state in every module is not complete.
- Full click-path coverage for every possible edge branch is not complete (coverage is strong for current smoke paths, not exhaustive).
- Full mobile visual regression coverage across all modules is not complete.
- Known risk to revisit in Oliver App:
  - Accounts detail view can still produce tap-target contention around the floating Oliver trigger in some mobile states; this needs direct UI remediation, not only test coverage.

## Required Definition of Done for Future Work

Every feature/change must satisfy all of the following before merge:

1. Changed routes work at phone viewport without blocked actions or unusable navigation.
2. No horizontal overflow on changed pages at mobile viewport.
3. Relevant mobile click paths are covered in E2E (new coverage added when behavior changes).
4. Required test commands pass:
   - Oliver App: `npm run test:smoke:all`
   - Tesknota: `npm run test:seeded-smoke:all`
5. CI must pass with mobile suite included.

## Revisit Checklist

When revisiting this document, update:

- pass/fail status of both combined smoke gates,
- newly identified mobile gaps by module/route,
- fixed items moved from "not done" to "done",
- any baseline enforcement changes in CI or contributor policy.
