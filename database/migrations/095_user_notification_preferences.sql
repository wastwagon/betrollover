-- Per-user notification channel preferences by category group (marketplace, wallet, social, account, system).
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_notification_preferences_user_type
  ON user_notification_preferences (user_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user
  ON user_notification_preferences (user_id);
