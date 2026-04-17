# QA — SDR Page

**Status:** Full React port complete. All 4 tabs functional.

## What's ported
- Overview: stat row, pipeline breakdown, pending drafts alert
- Prospects: filter pills (status + track), search, pagination, card grid
- Drafts: batch grouping, approve/reject actions via /api/sdr-approve
- Outreach: send history list with reply rate stats
- Prospect detail: slide-in panel with full field set, send history, copy email

## Known gaps / tech debt
- `/api/sdr-approve` endpoint: calls ops-dashboard function at `/api/sdr-approve`.
  This endpoint does not exist in oliver-app — needs a Cloudflare Pages Function port
  or Supabase direct update before approve/reject works in production.
- No drag-to-reorder on kanban (SDR has no kanban, but noted for consistency)
- No AI intake button (HR-specific feature, not applicable here)
