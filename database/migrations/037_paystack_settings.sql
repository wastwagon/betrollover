-- Paystack settings for admin-configurable API keys
-- Allows configuring Paystack from admin panel instead of .env only

CREATE TABLE IF NOT EXISTS paystack_settings (
  id SERIAL PRIMARY KEY,
  secret_key VARCHAR(255),
  public_key VARCHAR(255),
  mode VARCHAR(20) DEFAULT 'live' CHECK (mode IN ('live', 'test')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Single row for settings
INSERT INTO paystack_settings (id, mode)
SELECT 1, 'live'
WHERE NOT EXISTS (SELECT 1 FROM paystack_settings WHERE id = 1);
