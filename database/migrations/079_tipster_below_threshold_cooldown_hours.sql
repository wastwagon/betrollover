-- Hours between duplicate "paid pick requirements not met" notifications per tipster (in-app + email).
ALTER TABLE api_settings
  ADD COLUMN IF NOT EXISTS tipster_below_threshold_cooldown_hours INT NOT NULL DEFAULT 72;

COMMENT ON COLUMN api_settings.tipster_below_threshold_cooldown_hours IS 'Min hours between tipster_below_selling_thresholds alerts while ROI/win rate stay under platform minimums; 1–168.';
