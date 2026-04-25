# Auth + Permissions Runbook

## Required Environment Variables

Set these in Cloudflare Pages Functions for each environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (preferred) or `SUPABASE_SERVICE_KEY`
- `OWNER_EMAILS` (CSV of additional owner emails; `kiana.micari@vtwo.co` is always treated as owner by default)
- `OWNER_USER_IDS` (optional CSV of Azure oid/sub claims)

## Owner Bootstrap Procedure

1. Open Supabase SQL editor for the target environment.
2. Open and edit `scripts/setup-app-users.sql`:
   - Replace `REPLACE_WITH_OWNER_EMAIL@example.com`
   - Replace `REPLACE_WITH_OWNER_USER_ID`
3. Execute the script.
4. Verify owner row:

```sql
select user_id, email, role, page_permissions
from public.app_users
where lower(email) = lower('<kiana-email>');
```

Expected:
- `role = admin`
- `page_permissions` includes `accounts, hr, sdr, crm, slides`

## Identity Integrity Hardening

After owner bootstrap, run:

1. `scripts/dedupe-app-users.sql` (one-time cleanup of case-variant duplicates)
2. `supabase/migrations/004_app_users_email_ci_unique.sql` (enforce case-insensitive uniqueness)

## Post-Deploy Verification Checklist

1. Sign in as Kiana Micari.
2. Confirm hub renders stable module cards without flash/disappear.
3. Confirm `/admin` and `/design-system` are accessible.
4. Confirm owner row cannot be demoted or have permissions stripped in Admin UI.
5. Confirm non-admin user cannot access `/admin`, `/design-system`, `/slides`, `/sdr`, `/crm`.
6. Capture evidence in release traceability notes.

## Break-Glass Recovery

If owner/admin access is lost:

1. Re-run `scripts/setup-app-users.sql` with corrected owner identity values.
2. Confirm `OWNER_EMAILS`/`OWNER_USER_IDS` env vars are present.
3. Re-test owner sign-in and admin navigation.
4. Record incident root cause (seed drift, identity mismatch, or env/config drift).
