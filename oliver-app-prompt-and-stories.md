# Oliver App — Slide Editor: Frontend Prompt & User Stories

---

## PART 1: FRONTEND SYSTEM PROMPT
### Use this to brief a developer or AI to build the Oliver App slide editor UI

---

You are building **Oliver**, a web-based slide template editor for V.Two, a B2B consulting firm. Oliver is an internal tool that lets non-technical team members create, edit, duplicate, save, and export branded presentation slides without any design software.

---

### PRODUCT VISION

Oliver is a template library + drag-and-drop slide editor that lives in the browser. It is not a general-purpose design tool. Every slide is built on V.Two's brand system. The output is either a static HTML file (for hand-off) or a PDF (for client delivery). The tool should feel like a fast, focused alternative to PowerPoint — not Figma.

---

### TECH STACK RECOMMENDATION

- **Frontend framework**: React (Vite) or Next.js App Router
- **Styling**: Tailwind CSS + CSS variables for brand tokens
- **State management**: Zustand (lightweight, no boilerplate)
- **Drag/drop**: `@dnd-kit/core` for component repositioning
- **Persistence**: Supabase (Postgres + auth + storage) or Firebase
- **Export**: `html2canvas` + `jsPDF` for PDF; native Blob for HTML export
- **Auth**: Supabase Auth or Clerk (single org, no public signup)
- **Fonts**: Inter via Google Fonts (matches brand spec)

---

### BRAND TOKENS (hard-coded, never user-configurable)

```
--bg:        #171531  (slide background)
--dark-bg:   #0E0C22  (app shell background)
--purple:    #4D2B72
--pink:      #D32D74  (primary accent)
--white:     #FEFFFF
--blue:      #437DF7
--cyan:      #74FAFC
--gray:      #B0B1B5
--font:      "Inter", sans-serif
```

---

### APPLICATION ARCHITECTURE

#### 1. SHELL LAYOUT
```
┌──────────────────────────────────────────────────────────┐
│  TOPBAR: Logo | Library | My Slides | ← Back | [Save]   │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│  LEFT    │   SLIDE CANVAS (16:9, scales to fit)          │
│  PANEL   │                                               │
│          │                                               │
│  (comp   ├───────────────────────────────────────────────┤
│  list /  │   BOTTOM TOOLBAR: style controls, export      │
│  layers) │                                               │
└──────────┴───────────────────────────────────────────────┘
```

#### 2. SLIDE CANVAS
- Fixed 1920×1080 internal coordinate space
- Scales via CSS `transform: scale()` to fill available area while preserving 16:9 ratio
- Dark background matching brand
- Each component is absolutely positioned within the canvas
- Components are `div` elements with `position: absolute`, `left`, `top`, `width` stored in component state

#### 3. COMPONENT SYSTEM
Each draggable component has:
```typescript
interface SlideComponent {
  id: string
  type: "text" | "heading" | "subheading" | "card" | "row" | "stat" | "logo" | "tag-line" | "panel"
  x: number        // px from canvas left
  y: number        // px from canvas top
  width: number    // px
  height?: number  // px or "auto"
  content: string  // HTML string (contenteditable)
  style: {
    fontSize: number
    fontWeight: number
    color: string
    fontStyle: "normal" | "italic"
    // ... other CSS overrides
  }
  locked: boolean  // prevents accidental drag
  visible: boolean
}
```

#### 4. TEMPLATE LIBRARY
- Grid of slide thumbnails (rendered via `html2canvas` snapshot on save)
- Each template has: `name`, `category` (cover | content | data | closing), `tags`, `thumbnail_url`, `component_data` (JSON)
- Users can: preview, duplicate into "My Slides", or create new from blank
- Templates are read-only; duplicates are editable

#### 5. UNDO / REDO
- Zustand with an `undoStack: SlideState[]` and `redoStack: SlideState[]`
- Every user action (move, resize, text edit, style change) pushes a snapshot
- Text edits are debounced 800ms before pushing
- Max stack depth: 50
- Keyboard: `Ctrl+Z` undo, `Ctrl+Shift+Z` / `Ctrl+Y` redo

#### 6. MULTI-SELECT
- `Shift+click` adds/removes component from selection set
- Selected components show cyan dashed outline
- Bounding box shown around all selected components
- Multi-select enables: move together, align, distribute, delete all

#### 7. ALIGNMENT TOOLS (shown in bottom toolbar when 2+ selected)
- Align left edges
- Align right edges
- Align top edges
- Align bottom edges
- Center horizontally (to each other)
- Center vertically (to each other)
- Distribute evenly horizontal
- Distribute evenly vertical

All alignment is relative to the bounding box of the selection, matching PowerPoint behavior.

#### 8. TEXT EDITING
- Click any text component to enter edit mode (contenteditable)
- Bottom toolbar shows: font size (min 14px), color picker, weight, italic toggle
- "Apply Style" button uses `onmousedown` + `event.preventDefault()` to avoid blur-before-click bug
- Live preview: size and color update as slider/picker changes, not just on apply
- Style applies to the focused element only; multi-select style apply changes all selected text components

#### 9. EXPORT
**HTML Export:**
- Clones current canvas DOM
- Strips editor chrome (drag handles, labels, outlines)
- Removes `contenteditable` attributes
- Wraps in minimal HTML shell with embedded CSS
- Downloads as `[slide-name].html`
- Positions are already inline styles — no re-resolution needed

**PDF Export:**
- Opens a new window sized 1920×1080
- Injects full CSS + current component HTML
- Waits for `document.fonts.ready`, then calls `window.print()`
- User saves via browser print dialog (Save as PDF, Margins: None, Landscape)
- Alternative: server-side Puppeteer endpoint for pixel-perfect PDF (v2 feature)

#### 10. PERSISTENCE
- Auto-save to Supabase every 30 seconds if dirty
- Manual save button
- Slide data stored as JSON: `{ components: SlideComponent[], metadata: SlideMetadata }`
- Thumbnail generated via `html2canvas` on save and stored in Supabase Storage
- Duplicate creates a new `slide_id` with copied JSON

---

### COMPONENT BEHAVIORS

| Behavior | Implementation |
|---|---|
| Drag to move | `onMouseDown` → track delta → update `x`, `y` in state |
| Resize | SE corner handle → track delta → update `width` |
| Click to select | `onClick` on component → set as `primarySelection` |
| Shift+click | Add to `multiSelection` set |
| Escape | Clear all selections |
| Arrow keys | Nudge 1px; Shift+Arrow = 10px |
| Double-click | Enter text edit mode |
| Click outside | Deselect all, exit text edit |
| Scroll canvas | Pan (if canvas larger than viewport) |

---

### MINIMUM FONT SIZE ENFORCEMENT
- UI enforces 14px minimum on all text components
- Font size input has `min="14"` and clamps on blur
- Existing templates have no text below 14px

---

### SLIDE NUMBERING
- Optional slide number component, bottom-left
- User can toggle on/off per slide
- Format: `01 / 09` etc.

---

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

## PART 3: GAP CLOSURE (Module Architecture, Edge Cases, and HTML Conversion)
### Add these to implementation scope so the module is production-ready

---

### EPIC 11: Module Platform Architecture (Hub + Module Consistency)

**US-100** As a product owner, I want modules registered in one central module registry so adding/skipping modules does not require editing multiple files.
- AC: Hub cards are rendered from a central registry object, not hard-coded in the hub page
- AC: Module registry includes `id`, `name`, `description`, `href`, permission key, and chatbot defaults
- AC: Adding a module requires one registry entry + one route, without touching existing module code

**US-101** As an operator, I want to enable/disable modules by configuration so we can ship incrementally.
- AC: Module visibility can be controlled by a single config source (env flag or settings table)
- AC: Disabled modules are excluded from hub and direct navigation guards
- AC: Disabled state is logged with a clear reason for QA/debugging

**US-102** As a developer, I want each module to use the same shell contract so design consistency is preserved.
- AC: Each module has a route layout file, a page component, and module-specific stylesheet
- AC: Topbar/sidebar/back navigation behavior is consistent across modules
- AC: Shared tokens are used; no module introduces off-system colors/spacing without adding tokens

**US-103** As a developer, I want a shared chatbot registration helper so each module keeps consistent chatbot wiring.
- AC: Module chatbot config always includes page label, placeholder, greeting, and actions
- AC: Module-specific actions/flows can override defaults without bypassing shared guardrails
- AC: Chat history remains scoped by user + module/page label

**US-104** As a user, I want module permissions applied consistently so I only see routes I can access.
- AC: Hub visibility honors role/permissions and coming-soon flags
- AC: Direct URL access to unauthorized module routes redirects to hub (or access denied)
- AC: Admin permission editor supports all active module permission keys

---

### EPIC 12: HTML-to-Component Conversion (PowerPoint-like HTML Editing)

**US-110** As a user, I want to import an HTML slide file so I can convert legacy slides into editable components.
- AC: Import supports `.html` file upload and pasted HTML string
- AC: Import returns parsed component JSON in the editor schema
- AC: Import validates and reports parse errors with actionable feedback

**US-111** As a user, I want absolute-positioned HTML nodes mapped to slide components.
- AC: Import maps `left/top/width/height` from inline styles into component coordinates
- AC: Import infers component type (`heading`, `text`, `card`, `logo`, etc.) from tag/class heuristics
- AC: Nodes lacking coordinates are imported with defaults and flagged as warnings

**US-112** As a security reviewer, I want imported HTML sanitized before saving/rendering.
- AC: Scripts, inline event handlers, javascript URLs, and unsafe embeds are stripped
- AC: Sanitized content is what gets persisted and re-rendered
- AC: Sanitization rules are deterministic and covered by tests

**US-113** As a user, I want unsupported CSS/layout features identified during import.
- AC: Import warns on unsupported units/layouts (e.g., `%`, `vw/vh`, complex transforms)
- AC: Warning list is visible before save
- AC: User can continue with best-effort import

**US-114** As a user, I want imported slides normalized to 1920×1080 coordinates.
- AC: Source dimensions are detected when available
- AC: Coordinates are scaled into 1920×1080 when source size differs
- AC: Normalized result visually matches source proportion within tolerance

**US-115** As a user, I want export/import round-trip reliability.
- AC: Exported HTML from Oliver can be re-imported with no component loss
- AC: Position drift after one round-trip is <= 1px for `left/top/width`
- AC: Text content and style fields survive round-trip

---

### EPIC 13: Reliability, Collaboration, and Failure Handling

**US-120** As a user, I want safe saves when multiple sessions edit the same slide.
- AC: Slide records include revision/version metadata
- AC: Save API detects stale writes and returns conflict response
- AC: UI offers conflict resolution (reload, overwrite, or duplicate copy)

**US-121** As a user, I want unsaved-change protection.
- AC: Navigating away with dirty state triggers a confirm dialog
- AC: Browser tab close/refresh also prompts when dirty
- AC: Manual Save clears dirty flag immediately on success

**US-122** As a user, I want graceful behavior when offline or backend save fails.
- AC: Save failures show persistent error state (not transient toast-only)
- AC: Auto-save retries with backoff when network resumes
- AC: User can continue editing while queued saves retry

**US-123** As a user, I want crash recovery.
- AC: Editor writes local recovery snapshots while editing
- AC: On reopen after crash, user can restore latest unsaved draft
- AC: Restored draft can be discarded or committed

---

### EPIC 14: Accessibility, Keyboard, and Compliance

**US-130** As a keyboard user, I want full non-mouse editing controls.
- AC: Selection, nudge, align, resize, delete, and toolbar focus work from keyboard
- AC: Keyboard shortcuts are documented in-app
- AC: Shortcuts do not break while editing text fields/contenteditable

**US-131** As a user of assistive tech, I want meaningful semantics in editor controls.
- AC: Toolbar controls have labels and ARIA states
- AC: Selected component count and active element are announced
- AC: Focus order is predictable when entering/exiting text edit mode

**US-132** As a compliance owner, I want baseline contrast/accessibility checks.
- AC: Text controls prevent low-contrast combinations under brand theme
- AC: Focus indicators meet WCAG visible focus guidance
- AC: Exported slides preserve readable contrast

---

### EPIC 15: Data Governance and Auditability

**US-140** As an admin, I want template ownership and visibility controls.
- AC: Templates can be team-shared or private
- AC: Only authorized users can edit/delete shared templates
- AC: "Save as Template" defaults to private unless user explicitly shares

**US-141** As an admin, I want action logs for high-impact operations.
- AC: Save, delete, duplicate, export, and template-publish actions are logged
- AC: Logs include `user_id`, `slide_id`, timestamp, and action type
- AC: Admin can view logs for debugging and compliance

---

### Non-Functional Acceptance Criteria (cross-cutting)
- AC: Canvas interactions remain responsive at 60fps with at least 150 components on a slide
- AC: Initial editor load (existing slide JSON) completes in <2s on standard internal hardware
- AC: Auto-save payload excludes transient UI state (selection, hover, temporary handles)
- AC: E2E smoke includes create/edit/save/export/import round-trip on the Slide Editor module

---

## PART 4: Backlog Additions Requested (Hub Layout, Permission Banner, PPTX, Responsive Ratios)
### Added for tracking and implementation planning

---

### EPIC 16: Hub Module Components & Adaptive Layout

**US-150** As a user, I want the hub module list rendered by dedicated hub components so the home page is maintainable and consistent.
- AC: Hub home uses dedicated `HubModuleList` + `HubModuleButton/Card` components (not inline mapping in page file)
- AC: Hub module components are documented in the design-system page under a "Hub Modules" subgroup
- AC: Visual tokens and states (default/hover/focus/disabled/coming-soon) are defined and reusable

**US-151** As a user with access to 1–4 modules, I want a centered vertical module list under the V.Two Ops heading.
- AC: If user has 1 module, it appears centered horizontally under the V.Two Ops title block
- AC: If user has 2–4 modules, they render in a single vertical stack centered as one block
- AC: Vertical spacing between module buttons/cards is consistent via one spacing token

**US-152** As a user with access to 5+ modules, I want modules split into two columns while preserving visual balance.
- AC: Left column fills top-down first (up to 4 items), then right column starts top-down with remaining items
- AC: Right column top edge aligns with left column top edge
- AC: Horizontal gap between columns equals the vertical gap between rows
- AC: The two-column block is centered relative to both the page and the V.Two Ops title block

**US-153** As a user on smaller screens, I want hub module layout to adapt without overlap or clipping.
- AC: At mobile breakpoints, hub modules collapse to a single column
- AC: Module text remains readable; no truncation of module titles without tooltip or wrapping strategy
- AC: Keyboard focus order follows visual order

---

### EPIC 17: Permissions Fallback Banner Behavior

**US-160** As a user, I want the permissions fallback message displayed in a clear status area, not awkwardly under branding content.
- AC: Current message text `Permissions service unavailable. Falling back to the unrestricted module view for this session.` is moved to a dedicated status strip/banner region
- AC: Banner placement is visually separated from the V.Two Ops title/subtitle block
- AC: Banner uses warning/informational styling consistent with design tokens

**US-161** As an operator, I want diagnostics for permission fallback so we can debug why unrestricted mode was used.
- AC: Fallback trigger includes structured console/event log with timestamp and error reason
- AC: Distinguishes between network failure, API failure, and malformed user response
- AC: Fallback state is observable in QA and test scenarios

**US-162** As a product owner, I want policy control over fallback behavior.
- AC: Config toggle exists for `unrestricted_fallback` vs `restricted_fail_closed`
- AC: In fail-closed mode, users without resolved permissions see no modules and a support message
- AC: Behavior is documented for staging/production defaults

---

### EPIC 18: Slide Module Traceability (Stories ↔ Tests ↔ Features)

**US-170** As a team, we want each implemented slides capability mapped to a user story and automated test.
- AC: Story IDs are attached to feature PR/checklist items
- AC: Automated coverage includes route access, import parse, permission gating, and core editor interactions
- AC: A traceability table exists in this doc (story id → test file/spec name)

**US-171** As a QA lead, I want parser-specific tests for HTML import edge cases.
- AC: Tests cover sanitized script removal, unsupported style warnings, and type inference heuristics
- AC: Tests include at least one round-trip fixture (exported HTML → import result)
- AC: Parser tests run in CI (unit or e2e classification documented)

---

### EPIC 19: PPTX Export Backlog

**US-180** As a user, I want to export a slide/template to `.pptx` with editable native PowerPoint objects.
- AC: Text components become editable PPT text boxes (not flattened image)
- AC: Shapes/panels/cards map to PPT shapes where possible
- AC: Position, size, fill, stroke, and font properties are preserved within defined tolerance

**US-181** As a user, I want multi-slide PPTX export for selected slides/template sets.
- AC: User can select one or many slides for PPTX export
- AC: Slide order in PPTX matches selected order in app
- AC: Export includes optional notes metadata per slide (if present)

**US-182** As a user, I want clear fallback behavior when a component cannot be represented natively in PPTX.
- AC: Unsupported elements are listed in an export warnings report
- AC: Unsupported elements fall back to image snapshot blocks with position preserved
- AC: Export completes successfully with mixed native + fallback content

---

### EPIC 20: Responsive Aspect Ratio Conversion (4:3 ↔ 16:9 and Other Sizes)

**US-190** As a user, I want to change slide size/aspect ratio and have layout respond intelligently.
- AC: User can switch preset ratios (16:9, 4:3, 1:1) and custom dimensions
- AC: Conversion preserves component relative positions and spacing proportions
- AC: Text remains readable with minimum font constraints applied post-conversion

**US-191** As a user, I want per-template responsive rules so brand layouts adapt predictably across ratios.
- AC: Templates can define anchors/constraints (top/left/right/bottom/center)
- AC: Elements with constraints reposition/resize according to rules on ratio change
- AC: Rule conflicts produce validation warnings before save

**US-192** As a user, I want to preview ratio-converted output before committing.
- AC: Ratio switch opens preview diff mode (before vs after)
- AC: User can accept, cancel, or duplicate-into-new-size
- AC: Undo/redo fully supports ratio conversion operations

---

### EPIC 21: Design System Dynamic Sync + Admin Navigation Shell

**US-200** As an admin, I want the design-system page to dynamically reflect current component/design structure so documentation stays in sync.
- AC: Design-system inventory sections are driven by canonical component/config metadata (not only static hand-maintained arrays)
- AC: Newly added hub/module components appear in design-system documentation without manual page rewrites
- AC: Deprecated or hidden components are labeled with status and effective dates

**US-201** As an admin, I want design/component lock-in and structure changes surfaced automatically in the design-system page.
- AC: Token/component updates are shown with source-of-truth references (token key/component id)
- AC: Breaking changes are flagged with migration notes and impacted modules
- AC: A changelog section exists for recent component contract updates

**US-202** As an admin, I want a top-left `ADMIN` entry point that uses the same sidebar shell as other V.Two Ops pages.
- AC: Admin-capable users see an `ADMIN` button in top-left global navigation contexts
- AC: Clicking `ADMIN` opens/lands on an admin shell with shared sidebar structure (same interaction pattern as module pages)
- AC: Sidebar includes at minimum `Design System` and `Admin Dashboard`, with extensible nav items for future tools

**US-203** As an admin, I want the admin shell navigation extensible for future internal tools.
- AC: Admin nav items are registry/config driven
- AC: New admin tools can be added without editing base shell layout logic
- AC: Role/permission checks apply per admin nav item

**US-204** As a QA lead, I want automated coverage for the admin shell so navigation regressions are caught early.
- AC: Smoke tests verify admin sidebar visibility and key nav links (`Admin Dashboard`, `Design System`)
- AC: Non-admin users are redirected from admin shell routes
- AC: Top-left `ADMIN` entry visibility is tested for admin vs non-admin users

**US-205** As a QA lead, I want automated coverage for dynamic design-system inventories.
- AC: Smoke tests verify the `Dynamic Inventories` section renders
- AC: Tests assert module registry rows include current module set (including `slides`)
- AC: Tests assert admin navigation registry and component catalog tables render expected entries

---

### Traceability Snapshot (Current implementation status)
- `US-100` module registry foundation: implemented
- `US-103` shared module chatbot defaults: implemented
- `US-104` permission-driven module visibility: implemented (hub + route access guard)
- `US-150` hub modules rendered by dedicated list component: implemented
- `US-151` single-column centered module layout for <=4 modules: implemented
- `US-152` two-column split behavior for 5+ modules: implemented
- `US-160` permission fallback message moved to dedicated status banner region: implemented
- `US-110` HTML import entrypoint (paste/file) scaffold: implemented
- `US-111` absolute-position mapping heuristic: implemented (initial)
- `US-112` sanitization baseline: implemented (initial)
- `US-113` unsupported CSS/layout warnings: implemented (initial, parser warns on unsupported units/transforms)
- `US-114` canvas normalization to 1920x1080: implemented (initial)
- `US-200` design-system dynamic inventory from shared registries: implemented (initial)
- `US-202` admin entry button + shared admin sidebar shell: implemented (initial)
- `US-203` admin nav registry-based extensibility: implemented (initial)
- `US-204` admin shell automation coverage: implemented
- `US-205` dynamic inventory automation coverage: implemented
- `US-170` automated checks present in `tests/e2e/frontend-smoke.spec.ts` (route access + slides parse + module layout split + permission gating)
- `US-171` parser edge-case coverage: implemented (initial smoke coverage for unsupported units, normalization, sanitization, simple translate)

---

*End of Oliver App Frontend Prompt & User Stories (Expanded)*
*V.Two Internal — April 2026*
