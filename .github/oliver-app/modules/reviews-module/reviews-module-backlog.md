# Reviews Module Baseline + Identity Layer Backlog (2026-04-25)

Scope: `oliver-app` reviews module (`/reviews`) and canonical identity layer needed for cross-module person profiles.

Goal:
- Define the required baseline for frontend UX/design-system parity and interaction behavior.
- Define robust, testable user journeys for every primary workflow in reviews.
- Define the identity architecture protocol (Microsoft auth aware) so a person can be linked consistently across modules.

## Story Tracks

### Reviews module baseline + journeys
- `US-RVW-001`..`US-RVW-010`

### Identity layer protocol + rollout
- `US-IDN-001`..`US-IDN-006`

## Protocol Notes

- Every story follows the same project protocol:
  - `As a...`
  - `I want...`
  - `So...`
  - `Acceptance Criteria:` checklist
- Stories are written to be implementation-ready and QA-verifiable.
- Identity stories assume Microsoft sign-in as the auth source of truth.
