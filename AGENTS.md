<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Required Context Order
1. `docs/MODULE_CONTEXT.md`
2. `docs/MODULE_INSTRUCTIONS.md`
3. `docs/modules/<target-module>.md`

Do this before editing module code.

## Module Documentation Contract
- If module routing, visibility, permissions, chatbot commands/flows, or data contracts change, update docs in the same PR.
- Required updates when applicable:
  - `docs/MODULE_CONTEXT.md`
  - `docs/MODULE_INSTRUCTIONS.md`
  - `docs/modules/README.md`
  - `docs/modules/<target-module>.md`
- Source-of-truth for module metadata remains `src/modules/registry.ts`.

## Commit Rules
- Do not auto-commit after every change.
- Only commit when explicitly asked, or when a named milestone is complete.
- When committing, group all related changes into a single commit with a message matching the active milestone name.
- Never create more than one commit per working session unless explicitly told to start a new milestone.
- New commit work must map to a single epic (full epic milestone or incremental commit inside an existing epic).
- Before push/PR, run `npm run check-epic-size`; if thresholds are exceeded, squash into clean epic milestone commit(s).
- If assessment/audit work uncovers additional outstanding items that may be active in another terminal/session, document them but keep them out of the current commit scope.
