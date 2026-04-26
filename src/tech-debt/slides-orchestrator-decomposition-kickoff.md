# SLD-FE-610: Slides page orchestrator decomposition (Kickoff)

Date: 2026-04-26

Goal: Reduce risk and coupling in `src/app/slides/page.tsx` by extracting bounded modules one slice at a time.

## Initial slice (started)

- Extract PPTX export selection + action handlers into a dedicated hook/module:
  - Selection logic
    - visible selections
    - hidden-selection warnings
    - bulk actions: select-visible, keep-visible-only, clear-selection
  - Export action plumbing for current-slide export and selected-slide export
  - Busy/notifier state ownership for PPTX operations

## Current work completed

- `src/app/slides/page.tsx`
  - Added explicit hidden-selection handling action: **Keep Visible Only**
  - Keeps existing behavior and action labels intact for current PPTX workflows.

## Slice 1 acceptance criteria

- Current PPTX export behavior unchanged for existing tests:
  - `Export Selected PPTX (n)` button still reflects selected count.
  - Hidden selections continue to be included by loading complete slide set when needed.
- New action available to trim selection to currently visible list.
- No behavior regressions in:
  - `handleExportCurrentAsPptx`
  - `handleExportSelectedSlidesAsPptx`
  - `setPptxSelectedSlideIds` lifecycle

## Next implementation plan

1. Extract a `useSlidesPptxSelection` hook/module with:
   - derived counts and hidden-selection calculations
   - selection mutation helpers (`select/toggle/select-all/keep-visible/clear`)
2. Move export handlers into a small `useSlidesPptxExport` module and keep audit calls centralized.
3. Keep the page component as composition + rendering only, then remove remaining monolithic effects.
