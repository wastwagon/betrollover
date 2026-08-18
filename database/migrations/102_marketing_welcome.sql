-- Welcome-series marketing: consent timestamp + send log (one row per user per campaign).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMP NULL;

UPDATE users
SET marketing_consent_at = created_at
WHERE marketing_consent = TRUE
  AND marketing_consent_at IS NULL;

CREATE TABLE IF NOT EXISTS marketing_sends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_key VARCHAR(64) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, campaign_key)
);

CREATE INDEX IF NOT EXISTS idx_marketing_sends_user_sent
  ON marketing_sends (user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_campaign
  ON marketing_sends (campaign_key);
