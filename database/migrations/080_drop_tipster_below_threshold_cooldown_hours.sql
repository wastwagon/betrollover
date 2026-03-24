-- Removed: tipster below-threshold reminder notifications (enforcement stays on create-pick only).
ALTER TABLE api_settings DROP COLUMN IF EXISTS tipster_below_threshold_cooldown_hours;
