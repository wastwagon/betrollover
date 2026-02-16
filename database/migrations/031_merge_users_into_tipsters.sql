-- ============================================
-- Merge Users into Tipsters
-- All users (except admin) are tipsters. Create tipster records for users who don't have one.
-- ============================================

-- 1. Create tipster records for users who don't have one (role user or tipster, exclude admin)
INSERT INTO tipsters (username, display_name, avatar_url, bio, is_ai, tipster_type, user_id, is_active)
SELECT u.username, u.display_name, u.avatar, u.bio, false, 'human', u.id, true
FROM users u
WHERE u.role IN ('user', 'tipster')
  AND NOT EXISTS (SELECT 1 FROM tipsters t WHERE t.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM tipsters t WHERE t.username = u.username)
ON CONFLICT (username) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  display_name = EXCLUDED.display_name,
  avatar_url = COALESCE(EXCLUDED.avatar_url, tipsters.avatar_url),
  bio = COALESCE(EXCLUDED.bio, tipsters.bio),
  updated_at = NOW();

-- 2. Update tipsters that have matching user but null user_id (link them)
UPDATE tipsters t
SET user_id = u.id,
    display_name = COALESCE(NULLIF(t.display_name, ''), u.display_name),
    avatar_url = COALESCE(t.avatar_url, u.avatar),
    bio = COALESCE(t.bio, u.bio),
    updated_at = NOW()
FROM users u
WHERE t.username = u.username
  AND t.user_id IS NULL
  AND u.role IN ('user', 'tipster');
