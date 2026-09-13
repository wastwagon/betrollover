ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_user_id_unique
  ON users (telegram_user_id)
  WHERE telegram_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS telegram_vip_memberships (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  subscription_id INT REFERENCES subscriptions(id) ON DELETE SET NULL,
  telegram_user_id BIGINT,
  telegram_username VARCHAR(64),
  link_token VARCHAR(64) NOT NULL UNIQUE,
  invite_link VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'invited',
  joined_at TIMESTAMP,
  kicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telegram_vip_telegram_user_id
  ON telegram_vip_memberships (telegram_user_id)
  WHERE telegram_user_id IS NOT NULL;
