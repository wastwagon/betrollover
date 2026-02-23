-- =====================================================
-- Migration 055: Community Chat System
-- Chat rooms, messages, reactions, reports, bans
-- =====================================================

-- Chat rooms (platform-defined, admin-managed)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  icon        VARCHAR(10)  NOT NULL DEFAULT '💬',
  sort_order  INT          NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  pinned_message_id INT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default rooms
INSERT INTO chat_rooms (slug, name, description, icon, sort_order) VALUES
  ('announcements',     'Announcements',      'Official platform updates and news',               '📢', 0),
  ('general',           'General Lounge',     'General discussion for all members',               '🏠', 1),
  ('football',          'Football Room',      'Football picks, analysis and discussion',          '⚽', 2),
  ('basketball',        'Basketball Room',    'NBA, EuroLeague and basketball discussion',        '🏀', 3),
  ('tennis',            'Tennis Room',        'Tennis picks and match discussion',                '🎾', 4),
  ('rugby',             'Rugby Room',         'Rugby Union and League discussion',                '🏉', 5),
  ('hockey',            'Hockey Room',        'Ice hockey picks and discussion',                  '🏒', 6),
  ('mma',               'MMA & Combat',       'MMA, boxing and combat sports discussion',        '🥊', 7),
  ('volleyball',        'Volleyball Room',    'Volleyball picks and discussion',                  '🏐', 8),
  ('american-football', 'American Football',  'NFL and college football discussion',              '🏈', 9)
ON CONFLICT (slug) DO NOTHING;

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id             SERIAL PRIMARY KEY,
  room_id        INT          NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id        INT          NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  content        VARCHAR(500) NOT NULL,
  is_deleted     BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_reason VARCHAR(100),
  deleted_by     INT REFERENCES users(id),
  is_flagged     BOOLEAN      NOT NULL DEFAULT FALSE,
  flagged_count  INT          NOT NULL DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_room ON chat_messages(room_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_chat_msg_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_flagged ON chat_messages(is_flagged, created_at DESC) WHERE is_flagged = TRUE;

-- Add FK for pinned message (now that chat_messages exists)
ALTER TABLE chat_rooms
  ADD CONSTRAINT fk_pinned_message
  FOREIGN KEY (pinned_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;

-- Chat reactions (4 allowed: 👍 ❤️ 😂 🔥)
CREATE TABLE IF NOT EXISTS chat_reactions (
  id         SERIAL PRIMARY KEY,
  message_id INT         NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    INT         NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  emoji      VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_msg ON chat_reactions(message_id);

-- Chat reports
CREATE TABLE IF NOT EXISTS chat_reports (
  id          SERIAL PRIMARY KEY,
  message_id  INT         NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  reporter_id INT         NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  reason      VARCHAR(50) NOT NULL DEFAULT 'spam',
  is_reviewed BOOLEAN     NOT NULL DEFAULT FALSE,
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_reports_msg      ON chat_reports(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_unreviewed ON chat_reports(is_reviewed, created_at DESC) WHERE is_reviewed = FALSE;

-- Chat bans (mutes and full bans)
CREATE TABLE IF NOT EXISTS chat_bans (
  id         SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ban_type   VARCHAR(10) NOT NULL CHECK (ban_type IN ('mute', 'ban')),
  reason     VARCHAR(255),
  expires_at TIMESTAMP,       -- NULL = permanent
  banned_by  INT REFERENCES users(id),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_bans_user ON chat_bans(user_id, is_active) WHERE is_active = TRUE;

-- Add chat_warnings counter to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_warnings INT NOT NULL DEFAULT 0;
