-- Minimum win rate (%) for selling paid marketplace coupons; max coupons per tipster per UTC day (0 = unlimited).
ALTER TABLE api_settings
  ADD COLUMN IF NOT EXISTS minimum_win_rate DECIMAL(5, 2) NOT NULL DEFAULT 45.0;

ALTER TABLE api_settings
  ADD COLUMN IF NOT EXISTS max_coupons_per_day INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN api_settings.minimum_win_rate IS 'Tipsters need at least this win rate (settled picks) to list paid coupons on the marketplace.';
COMMENT ON COLUMN api_settings.max_coupons_per_day IS 'Max accumulator coupons a human tipster may create per UTC day; 0 = unlimited. AI tipsters (tipsters.is_ai) are exempt.';
