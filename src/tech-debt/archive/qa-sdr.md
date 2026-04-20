# SDR — Visual QA Checklist

**Status:** Full React port complete. All 4 tabs functional.

## Section Parity Status

### Overview (SdrOverview.tsx)
- [x] Stat row: Total, Active, Sent, Reply Rate
- [x] Pending drafts alert with "Review Drafts" button
- [x] Pipeline breakdown by status

### Prospects (SdrProspects.tsx)
- [x] Filter pills by status and track
- [x] Search bar
- [x] Prospect grid cards with status badges
- [x] Pagination

### Drafts (SdrDrafts.tsx)
- [x] Grouped by batch_date
- [x] Approve/Reject actions via POST /api/sdr-approve
- [x] Status badges

### Outreach (SdrOutreach.tsx)
- [x] Send list sorted by sent_at
- [x] Stat row when sends exist

### Prospect Detail (SdrProspectDetail.tsx)
- [x] Fixed right slide-in panel
- [x] sdr-detail-backdrop + sdr-detail-panel classes
- [x] Escape key closes panel
- [x] Body overflow hidden when open

## Responsive
- [x] sdr.css includes sdr-prospect-grid with auto-fill minmax(280px)
- [x] sdr-detail-panel fixed right slide-in (width 380px)

## Known Gaps
- /api/sdr-approve endpoint: needs Cloudflare Pages Function port in oliver-app — endpoint does not exist yet; approve/reject will fail in production
- No local /api/sdr-approve function in functions/api/ — must be added before SDR drafts feature works
