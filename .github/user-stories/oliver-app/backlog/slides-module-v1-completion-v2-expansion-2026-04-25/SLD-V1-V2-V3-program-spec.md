# Slides Module Program Spec (V1, V2, V3)

Date: 2026-04-25

## V1 Goal

Reliable import + editing + export for static fixed-size slide HTML.

### V1 Core Requirements

1. Convert imported HTML to editable SlideDocument JSON.
2. Export from SlideDocument JSON to HTML.
3. Export to PDF using rendered HTML output.
4. Export to PPTX with best-effort editable objects.
5. Support multi-slide decks.
6. Support proportional resizing (non-responsive reflow).

### V1 Intake Validation Requirements

- Upload intake accepts `.html` and `.htm`.
- Upload validation rejects empty files, oversize files, and invalid-looking markup.
- Paste intake accepts full HTML documents and partial fragments.
- Paste validation rejects empty payloads and plain text without markup.
- Upload and paste flow into one shared parser pipeline post-validation.

### V1 Import Fidelity Requirements

- Render uploaded/pasted HTML in an isolated hidden iframe before extraction.
- Wait for DOM readiness, `document.fonts.ready`, image load completion, and layout settle.
- Detect slide root in priority order:
  - `.page`
  - `[data-slide-root]`
  - `.slide-canvas`
  - `.slide`
  - `body`
- Extract geometry using `getBoundingClientRect()`.
- Extract styling using `getComputedStyle()`.
- Normalize coordinates relative to detected slide root.
- Use detected root computed dimensions and background as canvas basis (with consistent normalization to workspace canvas rules).
- Skip layout-only wrappers.
- Import only visual leaf content:
  - text leaves with direct text content
  - image nodes
  - visual containers with meaningful paint/border/shadow/radius/opacity
- Prevent parent/child text duplication.
- For nodes with child elements, import direct text-node content only when it is visually meaningful; skip parent text layers when children fully represent visible text.
- Preserve cards/containers as shape/group-equivalent layers.
- Preserve `.art` as card/container layer and import `.an`, `.al`, `.ad` as separate text layers within it.
- Import `::before` accent bars as thin shape layers when possible; otherwise emit warning and continue.
- Support `<img>` import including data URIs.
- Support external image URLs when accessible; emit warning entries when blocked/inaccessible.

### V1 Style Preservation Requirements

- Text layer preservation targets: font family, font size, weight, color, line height, letter spacing, text transform, opacity, and alignment.
- Shape/container preservation targets: background color/gradient, border, border radius, opacity, and shadow.
- Unsupported style values should degrade gracefully with explicit warnings.

### V1 Import Acceptance

- Imported slide visually matches source closely enough to begin editing immediately.
- Background is preserved (no fallback editor default replacing source background).
- No duplicate overlapping text layers.
- Layout structure (columns/cards/logo) remains intact.

### V1 Sample-Specific Parity Gate

Given import of `slide-10-artifacts.html`, result must satisfy:

- Dark navy/purple gradient background is preserved.
- Left/right column layout is preserved.
- Left headline remains large white and wrapped correctly.
- Expected text layers include:
  - `What We Leave Behind`
  - main headline copy
  - body paragraph copy
  - `2-week`
  - delivery-cycle line
  - each card number/title/description
- Four artifact cards render as rounded dark containers on right.
- Card text is not duplicated/overlapped.
- Cyan `2-week` metric appears in lower-left region.
- Bottom-right V logo is preserved as image layer.
- For this sample, `.page` root selection is preferred and should preserve 1900x1060-in-1920x1080 intent through consistent normalization behavior.

### V1 Data Model Enforcement

- Canvas renders from SlideDocument JSON only.
- Autosave stores SlideDocument JSON.
- Exports read SlideDocument JSON, not original HTML source.

Reference model contract:

```ts
type SlideDeck = {
  id: string
  width: number
  height: number
  slides: Slide[]
}

type Slide = {
  id: string
  elements: SlideElement[]
  background?: Background
}
```

### V1 Export Acceptance

- HTML export uses absolute-positioned layout and inline style payload suitable for deterministic replay.
- PDF export preserves rendered layout fidelity without major shifts.
- PPTX export maps text/shapes/images to editable objects where possible.
- PPTX limits are surfaced as warnings (for example gradients/shadows approximated).

### V1 Multi-Slide Acceptance

- User can create, duplicate, delete, and reorder slides in a deck.
- User can import HTML as a new slide or as a new deck.
- Deck persistence maintains ordered slide list.
- Slide navigation is fast enough for interactive editing workflows.

### V1 Proportional Resize Acceptance

- Canvas resize scales element coordinates/sizes proportionally.
- Layout does not break under supported target sizes (for example 1920x1080 to 1280x720).
- Canonical coordinates remain consistent in persisted JSON.

### V1 Canvas Normalization and Editability Contract

- Viewport scale/fit behavior is visual-only and separate from canonical coordinates.
- Imported layers (text, shapes/cards, images/logo) are fully editable through selection, move, resize, reorder, duplicate, delete, and keyboard nudge workflows.
- Autosave and exports must consume canonical SlideDocument coordinates rather than scaled preview coordinates.

### V1 Warning Taxonomy Contract

Warnings should include at minimum:

- Unsupported pseudo-element extraction
- Inaccessible external images
- Unsupported transforms
- CSS animation behaviors
- Canvas/video elements
- External stylesheet resolution limits
- Unsupported style value fallbacks

Warnings should be actionable and non-blocking unless parse cannot produce a usable slide structure.

## V2 Goal

Reusable slide system with templates, themes, and structured layout behavior.

### V2 Templates

- Save imported or edited slides as templates.
- Apply templates to new slides.
- Duplicate and share templates.
- Lock structural template regions while exposing editable zones.
- Reuse layout blocks.
- Replace text/images while preserving structural integrity.

Template reference model:

```ts
type Template = {
  id: string
  baseSlide: Slide
  lockedElements?: string[]
  editableZones?: string[]
}
```

### V2 Themes

- Apply brand themes to slides/decks.
- Change colors/fonts globally.
- Preserve consistency across decks.
- Prefer token references over hard-coded style values when possible.
- Offer optional imported-slide conversion to theme tokens.

Theme reference model:

```ts
type Theme = {
  fonts: { heading: string; body: string }
  colors: { primary: string; secondary: string; background: string; accent: string }
  spacingScale: Record<string, number>
}
```

### V2 Layout-Aware Editing Foundation

- Keep absolute positioning as default behavior.
- Add optional layout constraints for structured editing.
- Support columns, stacks, cards, and grids as constraint primitives.
- Add pinned behavior for anchored elements.

Layout reference model:

```ts
type LayoutConstraint = {
  type: 'stack' | 'row' | 'grid' | 'pinned'
  alignment?: 'left' | 'center' | 'right'
  gap?: number
}
```

### V2 reveal.js Export

- Export deck slides as reveal.js `<section>` structure.
- Preserve slide ordering and transitions.
- Start with fidelity mode (absolute positioned HTML per section).

### V2 Advanced Import (Optional Expansion)

- Better pseudo-element extraction.
- SVG support (image fallback first, vector-native later).
- Improved external CSS handling.
- Font embedding and fallback mapping.

### V2 Editing Experience Hardening

- Cleaner layer selection behavior.
- Group/ungroup operations.
- Z-index controls.
- Keyboard shortcuts and predictable layer-panel behavior.

## V3 Goal

Responsive/layout-aware slides with intelligent adaptation across aspect ratios.

### V3 Requirements

- Expand layout constraints engine across slide elements.
- Support pinned anchors for persistent edge/corner attachment.
- Support resilient columns, stacks, cards, and grids under resize.
- Allow aspect-ratio change with intelligent repositioning and minimal collision.

### V3 Acceptance

- Changing aspect ratio produces usable layout with bounded manual cleanup.
- Constraint-aware groups preserve relative spacing/alignment.
- Pinned elements retain expected anchors across size changes.

## Program Non-Goals (Until Explicitly Scheduled)

- Full arbitrary website import parity.
- Full animation/video/canvas parity.
- Perfect PPTX pixel parity for all CSS features.
