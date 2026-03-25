-- Price (GHS) for AI marketplace coupons when tipster ROI + win rate meet platform minimums (same as human paid coupons).
-- 0 = AI coupons always list as free. Default 5.00 GHS.
ALTER TABLE api_settings
  ADD COLUMN IF NOT EXISTS ai_marketplace_coupon_price DECIMAL(8, 2) NOT NULL DEFAULT 5.00;

COMMENT ON COLUMN api_settings.ai_marketplace_coupon_price IS 'GHS price for AI coupons when minimum ROI + win rate met; 0 = always free';
