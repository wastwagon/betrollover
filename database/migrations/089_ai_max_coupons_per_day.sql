-- Cap AI tipster marketplace coupons per UTC day (see admin Settings; prediction engine uses min(this, per-tipster max_daily_predictions in code config)).
ALTER TABLE api_settings
  ADD COLUMN IF NOT EXISTS ai_max_coupons_per_day INTEGER NOT NULL DEFAULT 2;

COMMENT ON COLUMN api_settings.ai_max_coupons_per_day IS 'Max coupons each AI tipster may publish per UTC day (capped vs ai-tipsters.config max_daily_predictions).';
