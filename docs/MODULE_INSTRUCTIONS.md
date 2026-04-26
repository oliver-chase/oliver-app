# Oliver App Module Instructions

Last updated: 2026-04-25.

Use this playbook before changing any module behavior.

## Required workflow
1. Identify the target module and open `docs/modules/<module>.md`.
2. Confirm module status/permission rules in `src/modules/registry.ts` and `src/modules/use-module-access.ts`.
3. If chatbot behavior is touched, update both module `commands.ts` and `flows.ts`, plus `src/lib/chatbot-conversation-paths.ts` when topic scope changes.
4. Keep module boundaries intact: do not import internals from other feature modules.
5. Update docs in the same PR when module routing, visibility, permissions, commands, flows, or data contracts change.

## Module boundary policy
- Hub modules may import shared/core (`src/components/shared`, `src/lib`, `src/types`, `src/modules`) but not each other.
- Admin workspace may not import hub internals.
- Hub modules may not import admin workspace internals.
- Run `npm run check-module-boundaries` to enforce these rules.

## Validation gates
- Required static gates: `npm run typecheck`, `npm run lint`, `npm run build`.
- Required browser gate for UX changes: `npm run test:smoke:all`.
- Targeted gates:
  - `npm run test:contracts` when API contracts change.
  - `npm run test:smoke` for desktop-only checks.
  - `npm run test:smoke:mobile` for mobile-only checks.

## Documentation update requirement
When module behavior changes, update all impacted docs:
- `docs/MODULE_CONTEXT.md`
- `docs/modules/README.md`
- `docs/modules/<module>.md`
- `CLAUDE.md` and/or `AGENTS.md` if agent workflow assumptions changed.
