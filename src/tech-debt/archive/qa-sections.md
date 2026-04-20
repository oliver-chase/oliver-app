# QA: OpportunitiesSection, ProjectsSection, ActionsSection, NotesSection

Run against: staging.oliver-app.pages.dev/accounts → select account → each section

---

## OpportunitiesSection

### Structure ids
- [ ] `#btn-add-opp` on "+ Add opportunity" button (`.btn-link`)
- [ ] `#opp-sort` on sort select
- [ ] `#btn-hide-lost` on "Show Lost" / "Hide Lost" filter chip
- [ ] `#opp-body` wrapping the grid
- [ ] `#opp-count-footer` below body: shows "N Pursuing · N Identified · N Won"

### Sort options
- [ ] "Newest first" (default) — `created_date` descending
- [ ] "By status" — alpha by status

### Filter chip
- [ ] Default: "Show Lost" (lost opps hidden)
- [ ] Active: "Hide Lost" + `.on` class (purple)
- [ ] Lost cards appear/disappear on toggle

### Count footer
- [ ] Shows only non-zero counts: "2 Pursuing · 1 Identified · 3 Won"
- [ ] Empty when no pursuing/identified/won

### OppCard
- [ ] Class: `project-card`
- [ ] Status badge: `.app-badge.app-badge--clickable.app-badge-{status}` (Picker, not cycler)
- [ ] Status options: Identified, Pursuing, Won, Lost
- [ ] Description: `.card-title` contentEditable
- [ ] Year: contentEditable span
- [ ] Owner(s): MultiPicker → `.card-owner-btn`
- [ ] Notes: `.card-body-text` contentEditable, placeholder "Add notes…"
- [ ] "→ Promote to Project": `.card-action-link`
- [ ] × delete: `.project-delete`

---

## ProjectsSection

### Structure ids
- [ ] `#btn-add-proj` on "+ Add project" button (`.btn-link`)
- [ ] `#proj-sort` on sort select
- [ ] `#btn-hide-complete` on filter chip
- [ ] `#proj-body` wrapping the grid
- [ ] `#proj-count-footer` below body: shows "N active" or empty

### Sort options
- [ ] "Newest first" (default, `created_date` desc)
- [ ] "Name A–Z" (`project_name` alpha)
- [ ] "By status" (status alpha)
- [ ] "By engagement" (`engagement_id`)

### Filter chip
- [ ] Default: "Show Complete" + `.on` (complete hidden by default)
- [ ] Click: "Hide Complete" + no `.on` class
- [ ] Complete projects appear/disappear on toggle

### Count footer
- [ ] Shows "N active" when active > 0
- [ ] Empty when no active projects

### ProjCard
- [ ] Class: `project-card`
- [ ] Status badge: cycle on click (Active → Complete → On Hold → Active)
- [ ] Name: `.card-title` contentEditable
- [ ] Year: contentEditable span
- [ ] Client stakeholders: MultiPicker
- [ ] Notes: `.card-body-text` contentEditable
- [ ] "← Move to Opportunity": `.card-action-link`
- [ ] × delete: `.project-delete`

---

## ActionsSection

### Structure ids
- [ ] `#btn-add-action` on "+ Add action" button (`.btn-link`)
- [ ] `#filter-action-status` on status filter select
- [ ] `#actions-body` wrapping the table
- [ ] `#actions-count-footer` below body: "N open · N in progress"

### Status filter options
- [ ] "Open + In Progress" (default) — shows Open and In Progress only
- [ ] "All statuses"
- [ ] "Open only"
- [ ] "Done only"

### Count footer
- [ ] Shows "2 open · 1 in progress" (only non-zero)
- [ ] Empty when none open/in-progress

### Table
- [ ] Class: `data-table` inside `.table-wrap`
- [ ] Columns: Action | Owner | Project | Status | (delete)
- [ ] Column headers clickable for sort (▲/▼ arrow on active column)
- [ ] Age dot shown for old open actions

---

## NotesSection

### Structure ids
- [ ] `#btn-add-note` on "+ Add note" button (`.btn-link`)
- [ ] `#notes-search` on search input (`.notes-search`)
- [ ] `#filter-date-from` — `type="date"` `.filter-date`
- [ ] `#filter-date-to` — `type="date"` `.filter-date`
- [ ] `#notes-sort-btn` on sort select (`.sort-select`)
- [ ] `#notes-body` wrapping the note cards

### Date range filter
- [ ] From date: filters out notes before this date
- [ ] To date: filters out notes after this date
- [ ] Both work together for a range

### Sort options
- [ ] "Newest first" (default, date descending)
- [ ] "Oldest first" (date ascending)

### NoteCard
- [ ] Title: contentEditable `.note-title`
- [ ] Date: contentEditable date span (MM/DD/YYYY display, ISO stored)
- [ ] Attendees chip row: `.app-chip` per attendee + × remove + add button
- [ ] Body: contentEditable `.note-body` (pre-wrap)
- [ ] Expand toggle: ▾/▴
- [ ] Clipboard copy button
- [ ] × delete: `.project-delete`

### Create note
- [ ] Uses meeting_title from background (no prompt if title set)
- [ ] Pre-fills attendees from meeting_attendees + account_team
- [ ] Note appears at top of list
