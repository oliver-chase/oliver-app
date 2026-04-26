# Oliver App Slide Editor User Stories (extracted from Oliver App Slide Editor prompt doc)

## PART 2: USER STORIES

### EPIC 1: Template Library

**US-001** As a V.Two team member, I want to browse a library of branded slide templates so I can find the right starting point quickly.
- AC: Templates are displayed as thumbnail cards in a grid
- AC: I can filter by category (Cover, Content, Data, Closing)
- AC: I can search by name or tag
- AC: Clicking a template shows a full-size preview

**US-002** As a user, I want to duplicate a template into my own slides so I can edit it without affecting the original.
- AC: "Use Template" button creates a copy in "My Slides"
- AC: Original template is read-only
- AC: Duplicate is immediately opened in the editor

**US-003** As a user, I want to save a slide I built as a new template so my team can reuse it.
- AC: "Save as Template" option in the editor
- AC: I can give it a name, category, and tags
- AC: Thumbnail is auto-generated on save
- AC: Template appears in the library immediately

**US-004** As a user, I want to see "My Slides" separate from the shared template library.
- AC: Personal slides are scoped to my account
- AC: I can rename, duplicate, or delete my slides
- AC: Last-edited timestamp is shown on each slide card

---

### EPIC 2: Canvas & Component Editing

**US-010** As a user, I want to drag any component to reposition it on the slide.
- AC: Components are draggable by clicking the component body (not text)
- AC: Position updates in real time during drag
- AC: Component snaps to its new position on mouse up
- AC: Position is stored as `left` / `top` px values relative to the 1920×1080 canvas

**US-011** As a user, I want to resize a component by dragging a handle.
- AC: A resize handle appears on the bottom-right corner of selected components
- AC: Dragging the handle changes component width
- AC: Minimum width of 80px is enforced

**US-012** As a user, I want to click text to edit it directly on the slide.
- AC: Single click enters edit mode (contenteditable)
- AC: I can type, select, and edit text normally
- AC: Clicking outside exits edit mode and saves content

**US-013** As a user, I want to use arrow keys to nudge a selected component 1px at a time.
- AC: Arrow keys move the selected component 1px in the arrow direction
- AC: Shift+Arrow moves 10px
- AC: Works for single and multi-select
- AC: Arrow key behavior is disabled when a text field has focus

**US-014** As a user, I want to see a label above each component when it is selected or hovered so I can identify it.
- AC: A small uppercase label (e.g., "TITLE", "ROW 02") appears above the component
- AC: Label disappears when component is deselected

---

### EPIC 3: Text Styling

**US-020** As a user, I want to change the font size of a selected text element.
- AC: Font size input in toolbar reflects the current element's font size on focus
- AC: Changing the value updates the element live
- AC: Minimum font size is 14px (enforced by input min attribute and on-blur clamp)
- AC: "Apply Style" commits the change

**US-021** As a user, I want to change the text color of a selected element.
- AC: Color picker reflects current element color on focus
- AC: Color updates live as I drag the picker
- AC: Apply Style commits the color

**US-022** As a user, I want to change font weight (light, regular, bold, black).
- AC: Weight dropdown reflects current element weight on focus
- AC: Changing weight updates element live

**US-023** As a user, I want to toggle italic on a text element.
- AC: Italic checkbox reflects current element state on focus
- AC: Toggling updates element immediately

**US-024** As a user, clicking "Apply Style" must work even after I clicked into the toolbar.
- AC: The Apply Style button uses `onmousedown` + `event.preventDefault()` to prevent blur from firing before click
- AC: `activeEl` is captured on `mousedown` of the text element, not only on `focus`
- AC: Clicking Apply Style correctly applies the toolbar values to the last-focused text element

---

### EPIC 4: Multi-Select & Alignment

**US-030** As a user, I want to select multiple components by Shift+clicking them.
- AC: Shift+click adds a component to the selection
- AC: Selected components show a cyan dashed outline
- AC: A count of selected components is shown in the status bar

**US-031** As a user, I want to move multiple selected components together.
- AC: Dragging any component in the multi-select moves all of them by the same delta
- AC: Arrow key nudge applies to all selected components

**US-032** As a user, I want to align multiple selected components.
- AC: Alignment dropdown appears when 2+ components are selected
- AC: Options: Left edges, Right edges, Top edges, Bottom edges, Center H, Center V, Distribute H, Distribute V
- AC: Alignment is computed relative to the bounding box of the selection
- AC: Undo captures state before alignment

**US-033** As a user, I want to distribute components with even spacing.
- AC: "Distribute H" places equal horizontal gaps between 3+ components
- AC: "Distribute V" places equal vertical gaps between 3+ components
- AC: Requires 3+ components selected; shows error message otherwise

---

### EPIC 5: Undo / Redo

**US-040** As a user, I want to undo my last action.
- AC: Ctrl+Z triggers undo
- AC: Undo button in toolbar is enabled when history exists
- AC: Undo restores position, size, and style of all components to the previous state
- AC: Undo restores text content

**US-041** As a user, I want to redo an action I undid.
- AC: Ctrl+Shift+Z or Ctrl+Y triggers redo
- AC: Redo is cleared when a new action is taken
- AC: Redo button is disabled when there is nothing to redo

**US-042** Text edits should be captured in undo history without creating a snapshot on every keystroke.
- AC: Undo snapshot is taken 800ms after the last keystroke in a contenteditable
- AC: Moving between elements or clicking away also flushes a snapshot immediately

---

### EPIC 6: Export

**US-050** As a user, I want to export a slide as a clean HTML file.
- AC: Clicking "Export HTML" downloads a `.html` file
- AC: The file contains no editor chrome (no drag handles, no toolbar, no outlines)
- AC: All component positions are correct inline styles
- AC: The file is self-contained and renders correctly when opened in any browser
- AC: `contenteditable` attributes are removed

**US-051** As a user, I want to export a slide as a PDF.
- AC: Clicking "Export PDF" opens a new browser window at 1920×1080
- AC: The window waits for fonts to load, then calls `window.print()`
- AC: User is instructed: Save as PDF, Margins: None, Orientation: Landscape
- AC: No editor chrome appears in the print output
- AC: Component positions are not re-resolved — the snapshot is used directly

**US-052** As a user, I want the PDF export to reflect my current edits, not the saved version.
- AC: Export uses the live DOM state, not the last saved state
- AC: Positions, text changes, and style changes are all reflected in the export

---

### EPIC 7: Persistence & Auto-Save

**US-060** As a user, I want my slide to auto-save every 30 seconds if I have made changes.
- AC: A "Saving..." indicator appears during save
- AC: A "Saved" indicator appears on success
- AC: Auto-save does not interrupt editing

**US-061** As a user, I want a manual Save button.
- AC: Clicking Save triggers an immediate persist
- AC: Save is disabled if no changes have been made since last save

**US-062** As a user, I want a thumbnail generated and stored when I save.
- AC: `html2canvas` captures the current canvas state
- AC: Thumbnail is uploaded to storage and associated with the slide record
- AC: Thumbnail appears in My Slides and the template library

---

### EPIC 8: Slide Management

**US-070** As a user, I want to duplicate a slide from My Slides.
- AC: Duplicate creates a new slide with the same component data
- AC: Duplicate is named "[Original Name] Copy"
- AC: Duplicate opens immediately in the editor

**US-071** As a user, I want to rename a slide.
- AC: Slide name is editable inline from the My Slides view
- AC: Name is also editable in the editor topbar

**US-072** As a user, I want to delete a slide.
- AC: Delete requires confirmation ("Are you sure? This cannot be undone.")
- AC: Deleted slides are removed from My Slides

**US-073** As a user, I want to see when a slide was last edited.
- AC: Last edited timestamp shown on slide cards in My Slides
- AC: Format: "2h ago", "Yesterday", or "Apr 22, 2026"

---

### EPIC 9: Canvas & Viewport

**US-080** As a user, I want the slide canvas to scale to fit my screen while maintaining 16:9 proportions.
- AC: Canvas is always 1920×1080 internally
- AC: `transform: scale()` is applied to fit available viewport height minus toolbars
- AC: Resizing the browser window re-scales correctly
- AC: Component px positions are always in the 1920×1080 coordinate space

**US-081** As a user, I want the toolbar to never overlap the slide canvas.
- AC: Toolbar is in normal document flow (not `position: fixed` over the canvas)
- AC: Canvas area is calculated as `viewport height - toolbar height`
- AC: This is achieved via flexbox column layout, not absolute positioning

---

### EPIC 10: Logo & Brand Compliance

**US-090** As a user, every slide must display the V.Two logo in the bottom-right corner.
- AC: Logo is embedded as a transparent PNG (black background removed)
- AC: Logo is positioned bottom-right with consistent margins (56px right, 38px bottom)
- AC: Logo component is draggable but not deletable
- AC: Logo opacity: 0.62

**US-091** As a user, all text on slides must be at least 14px.
- AC: Font size input has `min="14"`
- AC: On blur, values below 14 are clamped to 14
- AC: Templates are pre-validated to have no text below 14px

---

