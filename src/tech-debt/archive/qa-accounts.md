# Accounts — Visual QA Checklist

Generated after pixel-accurate migration audit pass.

## Fixed This Pass

- [x] GROUP 1: All `\u2026` unicode escapes in JSX string attributes replaced with actual `…` character (9 files: Filterbar, ActionsSection, ChatbotPanel, NotesSection, OrgChart, OverviewSection, PeopleSection, Picker, CustomPicker, AccountsApp)
- [x] GROUP 2: ChatbotPanel `send()` wired to POST `/api/chat` with account context payload
- [x] GROUP 3: Title case — "Recent activity" → "Recent Activity", "Clear all" → "Clear All" in HrReports
- [x] GROUP 4: btn-primary already pink via CSS token; no hardcoded color overrides found
- [x] GROUP 5: Meeting cadence Edit/Done button removed; click row to toggle open/closed; day labels updated from single letters to 2-letter abbreviations (Su/Mo/Tu/We/Th/Fr/Sa); getSummaryText uses full day names (Monday, Tuesday, etc.)
- [x] GROUP 6: Account Director and Account Manager now render as purple `app-chip` pills instead of Picker buttons; new `PersonPill` component handles change/remove
- [x] GROUP 7: Revenue historical year form inputs already use `var(--font-size-xs)` — no change needed
- [x] GROUP 8: `expanded` state for People card notes already initializes to `false` — no change needed
- [x] GROUP 9: OrgChart PersonDetailPanel already matches source `openOrgPersonDetail()` behavior
- [x] GROUP 10: All section headers follow consistent structure (app-section-header > app-section-title + section-header-row2 > section-header-left + section-actions)
- [x] GROUP 11: Status badge right-aligned via flex layout in card-title-row — handled by CSS
- [x] GROUP 12: Card structure consistent across Opportunities, Projects, People; accounts.css handles spacing
- [x] GROUP 13: ActionsSection empty state changed to "No results" to match source
- [x] GROUP 14: ExportPanel `generate()` fully implemented — builds HTML document matching source `buildAndPrintPDF()`, opens in new window for printing
- [x] GROUP 15: Show Lost / Hide Complete filter buttons moved LEFT of sort dropdown in Opportunities and Projects sections
- [x] GROUP 16: Mobile breakpoints (768px, 480px) with 44px touch targets already in accounts.css and hr.css
- [x] GROUP 17: Token sweep — no hardcoded colors or font-sizes found in components (ExportPanel PDF strings are intentionally hardcoded)

## Known Gaps / Future Work

- ChatbotPanel export button exports to clipboard (not download) — acceptable for now
- HR Hiring: "AI Intake" button not ported (HiringIntake.showUploadModal() depends on ops-dashboard AI infrastructure)
- HrTracks: "Apply Track" button is a no-op — functionality not yet ported
- OrgChart SVG connector lines may need position adjustments on mobile
- People card `showExpand` only appears after overflow is detected (requires layout measurement on mount)
