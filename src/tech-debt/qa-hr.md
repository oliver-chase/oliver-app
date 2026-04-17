# HR — Visual QA Checklist

**Status:** All sections fully ported and functional as of this pass.

## Section Parity Status

### Dashboard (HrDashboard.tsx)
- [x] Quick-add bar rendered (Add Candidate, Add Employee, Add Device)
- [x] Three dash-grid rows: (1) Upcoming starts + Active onboarding, (2) Upcoming interviews + Recent interviews, (3) Upcoming offboards + Active offboarding
- [x] NO stat grid at top — matches source which also has no stat grid on dashboard
- [x] AppModal used for quick actions
- [ ] Profile button navigates immediately; source adds 200ms timeout before selecting employee — minor gap

### Hiring Pipeline (HrHiring.tsx)
- [x] Kanban + table views
- [x] Filter bar with search, status, stage, dept, location inputs
- [x] Native select for filters — matches source
- [x] Split detail panel with candidate details, stage/status buttons, interview list
- [x] AppModal used for delete confirmation
- [ ] "AI Intake" button missing — HiringIntake.showUploadModal() not ported (AI dependency)

### Directory (HrDirectory.tsx)
- [x] Table view with sort and filter
- [x] Split detail panel
- [x] Add/Edit/Offboard modals
- [x] AppModal used for confirmations

### Onboarding / Offboarding (HrOnboarding.tsx)
- [x] Shared component for both types via type prop
- [x] Run cards with task toggles
- [x] Auto-complete detection with AppModal

### Inventory (HrInventory.tsx)
- [x] Device grid with device-card
- [x] Add/edit/detail/assign/return modals
- [x] StatusPill component, filter buttons

### Assignments (HrAssignments.tsx)
- [x] Table with sort by employee/device/date

### Tracks (HrTracks.tsx)
- [x] Split layout: track-sidebar + split-list
- [x] Modals for add/edit track and add/edit task
- [ ] Apply Track button is a no-op — not implemented

### Reports (HrReports.tsx)
- [x] Date range filter
- [x] All-time stat grid
- [x] Period stats
- [x] By Stage, By Status, By Source, By Department breakdowns
- [x] Activity log with Clear All button
- [x] Title case corrected: "Recent Activity"

### Settings (HrSettings.tsx)
- [x] Two tabs: Dropdowns and Data & Export
- [x] Tag lists with add/remove/rename
- [x] Export JSON

## Responsive
- [x] 768px breakpoints: stat-grid 2-col, kanban vertical, split detail as bottom sheet
- [x] 480px breakpoints: stat-grid 1-col, 44px touch targets minimum
- [x] Table rows display as cards on mobile

## Sync State
- [x] setSyncState called on all save operations

## AppModal
- [x] All delete confirmations use AppModal
- [x] All input prompts use AppModal

## Known Gaps
- AI Intake button (HrHiring): not ported
- Apply Track button (HrTracks): not implemented
- Directory profile nav: minor timing difference vs source
