# Slides Module User Stories (extracted from slides-module-prd.md)

## User Story 1
As a user, I want to import HTML and have it reconstruct exactly as a slide so that I do not have to manually rebuild layout, styles, or content.

### Acceptance Criteria
- Imported slide visually matches rendered HTML within acceptable tolerance
- Background is preserved (no fallback editor color)
- Text is correctly scaled (no tiny or oversized text)
- Layout structure (columns, cards, alignment) is preserved
- No elements collapse to a corner or overlap incorrectly

---

## User Story 2
As a user, I want the system to interpret the rendered layout instead of raw HTML so that flex/grid-based designs import correctly.

### Acceptance Criteria
- HTML is rendered in an isolated iframe
- Parser waits for:
  - DOM ready
  - fonts loaded
  - images loaded
- Layout measurements use `getBoundingClientRect()`
- Styles use `getComputedStyle()`

---

## User Story 3
As a user, I want a single coordinate system preserved so that scaling and positioning are consistent.

### Acceptance Criteria
- Slide root defines coordinate system
- All element positions are relative to root
- Font sizes scale consistently with elements
- Editor zoom is not baked into stored values
- No bottom-left clustering bug

---

## User Story 4
As a user, I want clean layer extraction so that I can actually edit the slide.

### Acceptance Criteria
- Each visible text block appears exactly once
- No parent/child duplicate text
- Layout wrappers are not imported as text
- Text remains editable and positioned correctly

---

## User Story 5
As a user, I want visual components like cards preserved so that the structure remains usable.

### Acceptance Criteria
- Containers with background/border become shape layers
- Related elements grouped logically
- Layout-only wrappers ignored
- Cards can be moved without breaking internal structure

---

## User Story 6
As a user, I want assets preserved so that visuals are intact.

### Acceptance Criteria
- Images render correctly
- Data URIs supported
- External assets either load or warn
- Position and size preserved

---

## User Story 7
As a user, I want clear warnings so that I know what may be incorrect.

### Acceptance Criteria
- Warnings generated for unsupported features
- Warnings visible in UI
- Import continues unless critical failure

---

# Epic 2: Editing Experience

## User Story 8
As a user, I want to edit slide content directly so that I can make changes quickly.

### Acceptance Criteria
- Text is editable inline
- No layout shift during editing
- Multiline text supported

---

## User Story 9
As a user, I want to manipulate elements so that I can refine layout.

### Acceptance Criteria
- Drag to move
- Resize handles
- Coordinates update accurately

---

## User Story 10
As a user, I want structural integrity maintained so that I do not accidentally break layouts.

### Acceptance Criteria
- Groups move as units
- Layer hierarchy preserved
- Selection behavior is predictable

---

# Epic 3: Export System

## User Story 11
As a user, I want exports that match what I see so that outputs are reliable.

### Acceptance Criteria
- HTML export visually matches canvas
- PDF export matches rendered HTML
- PPTX export preserves structure (best effort)

---

# Epic 4: Multi-Slide System

## User Story 12
As a user, I want to manage multiple slides so that I can build presentations.

### Acceptance Criteria
- Create, duplicate, delete, reorder slides
- Import adds slides correctly

---

# Epic 5: Templates and Reuse (V2)

## User Story 13
As a user, I want reusable slide structures so that I can scale content creation.

### Acceptance Criteria
- Templates preserve layout
- Applying template creates new instance

---

# Epic 6: Print/PDF Clean Export Quality

## Intent
The system must export slides to PDF without editor artifacts, gridlines, browser headers, unwanted borders, or layout shifts.

---

## User Story 14
As a user, I want PDF exports to remove editor-only gridlines so that the exported file looks like a finished presentation, not the editing workspace.

### Acceptance Criteria
- Canvas gridlines, guides, selection boxes, resize handles, hover states, and editor UI never appear in PDF output
- Export uses a dedicated print/export render path, not the visible editing canvas
- Any editor-only CSS is excluded using export-safe classes or print media rules
- PDF output contains only slide content and intended design elements

---

## User Story 15
As a user, I want browser print settings handled by the app so that I do not need to manually uncheck headers, footers, or adjust background settings.

### Acceptance Criteria
- App-generated PDF does not include browser headers, footers, file paths, dates, or page numbers unless explicitly enabled
- Background colors, gradients, and images are included by default
- Export path uses controlled PDF generation settings instead of relying on manual browser print configuration
- Manual browser print instructions are documented only as a fallback, not the primary workflow

---

## User Story 16
As a user, I want intended borders and accidental gridlines to be treated differently so that the design is preserved while export artifacts are removed.

### Acceptance Criteria
- Intended slide borders, card borders, and design rules remain visible
- Editor gridlines and layout helper lines are removed
- Table/grid borders are only removed if they are identified as import/export artifacts, not intentional design elements
- Export-safe CSS distinguishes between design layers and editor helper layers

---

## User Story 17
As a user, I want PDF export to preserve the slide’s size and scale so that the exported file does not add unwanted margins, shrink content, or create broken lines.

### Acceptance Criteria
- PDF page size matches the SlideDocument size or selected export size
- Export uses zero margins unless the user selects margins
- Content is not automatically shrunk by browser print defaults
- Background fills render to the correct edges
- One slide exports as one PDF page

---
