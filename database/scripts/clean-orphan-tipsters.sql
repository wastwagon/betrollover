-- One-off: Remove tipster rows that no longer have a user (deleted users).
-- Run this on VPS/Coolify if deleted users (e.g. Google/Apple) still appear in the tipsters list.
--
-- Option A: Human tipsters with user_id NULL (left after ON DELETE SET NULL)
-- Option B: Tipsters whose user_id no longer exists in users (safety net)
--
-- Usage (Coolify: open Terminal for the resource, then):
--   docker exec -i <postgres-container-name> psql -U betrollover -d betrollover -f - < database/scripts/clean-orphan-tipsters.sql
--
-- Or from host where repo is cloned:
--   docker exec -i betrollover-postgres psql -U betrollover -d betrollover < database/scripts/clean-orphan-tipsters.sql

BEGIN;

-- Delete human tipsters (is_ai = false) with no user link
DELETE FROM tipsters
WHERE is_ai = false
  AND (user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = tipsters.user_id));

-- Show how many were removed (run separately if you want a dry-run count first)
-- SELECT COUNT(*) FROM tipsters WHERE is_ai = false AND (user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = tipsters.user_id));

COMMIT;
