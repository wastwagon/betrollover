-- ============================================
-- Backfill tipster profiles for users missing from public browse/leaderboard.
-- Admin Users shows ticket stats without a tipsters row; /tipsters and /leaderboard require one.
-- ============================================

-- 1) Users with tipster/user role who have no tipsters.user_id link
INSERT INTO tipsters (username, display_name, avatar_url, bio, is_ai, tipster_type, user_id, is_active)
SELECT u.username,
       COALESCE(NULLIF(TRIM(u.display_name), ''), u.username),
       u.avatar,
       u.bio,
       false,
       'human',
       u.id,
       true
FROM users u
WHERE u.role IN ('user', 'tipster')
  AND u.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM tipsters t WHERE t.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM tipsters t WHERE t.username = u.username)
ON CONFLICT (username) DO UPDATE SET
  user_id = COALESCE(tipsters.user_id, EXCLUDED.user_id),
  display_name = COALESCE(NULLIF(TRIM(tipsters.display_name), ''), EXCLUDED.display_name),
  avatar_url = COALESCE(tipsters.avatar_url, EXCLUDED.avatar_url),
  bio = COALESCE(tipsters.bio, EXCLUDED.bio),
  is_active = true,
  tipster_type = COALESCE(tipsters.tipster_type, 'human'),
  updated_at = NOW();

-- 2) Marketplace / ticket sellers who somehow still lack a tipster row
INSERT INTO tipsters (username, display_name, avatar_url, bio, is_ai, tipster_type, user_id, is_active)
SELECT u.username,
       COALESCE(NULLIF(TRIM(u.display_name), ''), u.username),
       u.avatar,
       u.bio,
       false,
       'human',
       u.id,
       true
FROM users u
WHERE u.status = 'active'
  AND (
    EXISTS (SELECT 1 FROM pick_marketplace pm WHERE pm.seller_id = u.id)
    OR EXISTS (SELECT 1 FROM accumulator_tickets at WHERE at.user_id = u.id)
  )
  AND NOT EXISTS (SELECT 1 FROM tipsters t WHERE t.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM tipsters t WHERE t.username = u.username)
ON CONFLICT (username) DO UPDATE SET
  user_id = COALESCE(tipsters.user_id, EXCLUDED.user_id),
  is_active = true,
  tipster_type = COALESCE(tipsters.tipster_type, 'human'),
  updated_at = NOW();

-- 3) Link orphan tipster rows that match username but have null user_id
UPDATE tipsters t
SET user_id = u.id,
    display_name = COALESCE(NULLIF(TRIM(t.display_name), ''), u.display_name, u.username),
    avatar_url = COALESCE(t.avatar_url, u.avatar),
    bio = COALESCE(t.bio, u.bio),
    is_active = true,
    tipster_type = COALESCE(t.tipster_type, 'human'),
    updated_at = NOW()
FROM users u
WHERE t.username = u.username
  AND t.user_id IS NULL
  AND u.role IN ('user', 'tipster', 'admin');

-- 4) Reactivate linked tipsters that were soft-disabled but still have active user accounts
UPDATE tipsters t
SET is_active = true,
    updated_at = NOW()
FROM users u
WHERE t.user_id = u.id
  AND t.is_active = false
  AND u.status = 'active'
  AND COALESCE(t.is_ai, false) = false
  AND (
    u.role IN ('tipster', 'admin')
    OR EXISTS (SELECT 1 FROM pick_marketplace pm WHERE pm.seller_id = u.id)
    OR EXISTS (SELECT 1 FROM accumulator_tickets at WHERE at.user_id = u.id)
  );
