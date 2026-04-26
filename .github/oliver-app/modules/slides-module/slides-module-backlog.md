# Slides Module Backlog (2026-04-26)

Scope: all module stories for `/slides` including UX, FE/BE platform parity, and V1->V3 program execution.

## Coverage Layers

- `S0..S6` execution layer (backfill, import hardening, editor/interaction safety, platform integration, telemetry)
- V1 completion (`US-SLD-050`..`US-SLD-058`)
- V2 expansion (`US-SLD-060`..`US-SLD-065`)
- V3 responsive/resizing evolution (`US-SLD-070`)

## Current Priority Signals

- Keep parity backlog and V1/V2/V3 backlog as one folder for module-level planning.
- Prioritize unresolved items against existing completion map in this folder and pick next work by epic risk.

## Core Anchors

- Canonical program spec: `SLD-V1-V2-V3-program-spec.md`
- Gap closure and execution index: story files grouped by `US-SLD-*`, `SLD-*` and `US-RVW-*` patterns
- QA/trace artifacts: `QA-2026-04-24.md`, `GAP-REGISTER.md`

## Reference Context

- Slides route and command flows: `src/app/slides/page.tsx`, `src/app/slides/commands.ts`, `src/app/slides/flows.ts`
- Import/editor surfaces: `src/components/slides/*`
- Parser and runtime paths: `src/components/slides/html-import.ts`, `src/components/slides/types.ts`
