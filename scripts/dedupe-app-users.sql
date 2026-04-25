-- dedupe-app-users.sql
-- One-time cleanup for case-variant or legacy duplicate identities in app_users.
--
-- Strategy:
-- - Group by lower(email).
-- - Keep one row per group (prefer non-placeholder user_id).
-- - Merge admin role and union page_permissions into keeper row.
-- - Repoint known foreign references to keeper user_id.
-- - Delete duplicate rows.

BEGIN;

WITH ranked AS (
  SELECT
    user_id,
    email,
    lower(email) AS email_key,
    role,
    page_permissions,
    created_at,
    updated_at,
    CASE WHEN lower(user_id) = lower(email) THEN 1 ELSE 0 END AS placeholder_rank,
    ROW_NUMBER() OVER (
      PARTITION BY lower(email)
      ORDER BY
        CASE WHEN lower(user_id) = lower(email) THEN 1 ELSE 0 END ASC,
        created_at ASC,
        user_id ASC
    ) AS row_num
  FROM public.app_users
),
keepers AS (
  SELECT *
  FROM ranked
  WHERE row_num = 1
),
dupes AS (
  SELECT
    r.user_id AS duplicate_user_id,
    k.user_id AS keep_user_id,
    r.email_key
  FROM ranked r
  JOIN keepers k ON k.email_key = r.email_key
  WHERE r.row_num > 1
),
merged AS (
  SELECT
    k.user_id AS keep_user_id,
    CASE WHEN BOOL_OR(r.role = 'admin') THEN 'admin' ELSE 'user' END AS merged_role,
    ARRAY_AGG(DISTINCT perm.permission) FILTER (WHERE perm.permission IS NOT NULL) AS merged_permissions
  FROM keepers k
  JOIN ranked r ON r.email_key = k.email_key
  LEFT JOIN LATERAL UNNEST(COALESCE(r.page_permissions, '{}'::text[])) AS perm(permission) ON TRUE
  GROUP BY k.user_id
)
UPDATE public.app_users a
SET
  role = merged.merged_role,
  page_permissions = COALESCE(merged.merged_permissions, '{}'::text[]),
  updated_at = NOW()
FROM merged
WHERE a.user_id = merged.keep_user_id;

-- Repoint known references before deleting duplicate user rows.
UPDATE public.slides s
SET owner_user_id = d.keep_user_id
FROM dupes d
WHERE s.owner_user_id = d.duplicate_user_id;

UPDATE public.slide_templates t
SET owner_user_id = d.keep_user_id
FROM dupes d
WHERE t.owner_user_id = d.duplicate_user_id;

UPDATE public.slide_audit_events e
SET actor_user_id = d.keep_user_id
FROM dupes d
WHERE e.actor_user_id = d.duplicate_user_id;

DELETE FROM public.app_users a
USING dupes d
WHERE a.user_id = d.duplicate_user_id;

COMMIT;
