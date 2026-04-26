# US-O33 Cross-Module Journey Matrix (2026-04-26)

Scope: Hub, Admin, Design System, Slides, and chatbot-triggered module actions.

## Matrix

| Journey ID | Surface | Happy Path Coverage | Permission-Denied Coverage | Backend-Failure Coverage | Recovery Coverage | Click-Path + State Assertions | Test Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M-HUB-001 | Hub module navigation | Hub links render and navigate to Accounts/HR/SDR/Slides/Campaigns/Admin | Non-admin module visibility and route denial enforced | n/a (hub shell is static nav) | Redirect fallback to hub for disallowed routes | Verifies destination URL + visible module controls after navigation | `frontend-smoke`: `hub cards and admin links navigate correctly`; `major routes render a non-empty shell`; `non-admin user cannot access admin and does not see admin links` |
| M-ADM-010 | Admin user access workspace | Admin shell + nav render and User Manager owner lock behavior | Non-admin admin route block + chatbot admin-scope block | User manager backend read failure surfaces transient error state | Reload recovers user manager list after transient backend failure | Verifies `/admin` and `/design-system` navigation and control visibility for owner/member rows | `frontend-smoke`: `admin workspace keeps design-system navigation in the admin sidebar`; `owner rows are locked in user manager controls`; `admin user manager surfaces backend failures and recovers after refresh`; `non-admin user cannot access admin and does not see admin links` |
| M-DS-020 | Design System admin workspace | Interactive controls, audit panels, and token edit persistence | Non-admin `/design-system` redirect to hub | Token save failure surfaces backend error in admin-edit workspace | Cancel restore returns token value to pre-edit state | Verifies tab/nav transitions, modal interactions, persisted token value across reload, and usage-state labels | `frontend-smoke`: `design system interactive controls behave consistently`; `design system dead-token audit separates candidate-unused and untracked states`; `design system token edits persist across reload through backend contract`; `design system token save failures surface errors and cancel restores original value` |
| M-SLD-030 | Slides import/save/editor workflows | HTML parse, edit, save, export, and audit/template operations | Non-admin slides route block to hub | Autosave/API failure paths are surfaced via retry/degraded states | Retry backoff and degraded local-draft recovery controls are validated | Verifies workspace tab navigation, save state transitions, and persisted slide/template/audit outcomes | `frontend-smoke`: `US-SLD-003 ...`; `US-SLD-029 ...`; `US-SLD-040 ...`; `slides-regression`: `US-SLD-039 ...`; `US-O31 autosave enters degraded local-draft mode after retry budget is exhausted` |
| M-CHAT-040 | Chatbot module parity and routing | Chatbot quick actions open intended module destinations | Cross-module scope violations blocked (admin and hidden CRM flows) | n/a (routing guard paths are local intent checks) | Corrective guidance keeps user in current module and provides next action | Verifies route remains stable when denied and destination changes when action is valid | `frontend-smoke`: `accounts chatbot fuzzy aliases ...`; `non-admin chatbot prompts for admin scope are blocked without route changes`; `admin chatbot quick command opens design system without dead-end routing`; `chatbot hides dormant module routing prompts when module is not enabled`; `US-SLD-029 ...` |

## Shared Component + Token Regression Scope

The matrix requires running shared-style and token checks alongside behavioral tests:

- Static token/style drift gate: `npm run lint` (includes `npm run check-tokens` and module boundary checks).
- Design System regression assertions for token usage/audit state and token-edit persistence/failure recovery in `tests/e2e/frontend-smoke.spec.ts`.

## Contract Coverage for Critical Writes + High-Volume Reads

- `/api/users` write/read contracts: `tests/contracts/users-api.contract.test.mjs`
  - admin save success, missing identity, spoofed non-admin read, identity mismatch.
- `/api/slides` contracts: `tests/contracts/slides-api.contract.test.mjs`
  - structured unauthorized envelope,
  - sanitized upstream HTML failure envelope (ray + correlation),
  - save-write response shape,
  - high-volume audits read pagination envelope.
