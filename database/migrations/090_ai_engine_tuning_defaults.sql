-- Tighter AI volume defaults: one coupon per tipster per UTC day unless admin raises it.
ALTER TABLE api_settings
  ALTER COLUMN ai_max_coupons_per_day SET DEFAULT 1;

UPDATE api_settings
SET ai_max_coupons_per_day = 1
WHERE id = 1 AND ai_max_coupons_per_day > 1;

COMMENT ON COLUMN api_settings.ai_max_coupons_per_day IS 'Max coupons each AI tipster may publish per UTC day (capped vs ai-tipsters.config max_daily_predictions). Default 1 for selective volume.';
