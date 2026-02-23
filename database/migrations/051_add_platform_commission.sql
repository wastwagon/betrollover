-- Migration 051: Platform commission rate on api_settings
-- Enables admin-configurable commission deducted from tipster payouts on winning coupons.
-- Commission is recorded in wallet_transactions (type='commission') for revenue analytics.

-- Add column to api_settings
ALTER TABLE api_settings
  ADD COLUMN IF NOT EXISTS platform_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.0;

-- Ensure value is in a valid range (0–50%)
ALTER TABLE api_settings
  DROP CONSTRAINT IF EXISTS api_settings_commission_range;
ALTER TABLE api_settings
  ADD CONSTRAINT api_settings_commission_range
    CHECK (platform_commission_rate >= 0 AND platform_commission_rate <= 50);

-- Index for commission transaction lookups (revenue analytics)
CREATE INDEX IF NOT EXISTS idx_wallet_tx_commission
  ON wallet_transactions(type, created_at DESC)
  WHERE type = 'commission';

-- Seed default value on existing row
UPDATE api_settings
SET platform_commission_rate = 10.0
WHERE id = 1 AND platform_commission_rate IS NULL;
