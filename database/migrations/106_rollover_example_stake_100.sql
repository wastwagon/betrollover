-- Example ladder uses GHS 100 start for the 10-day AccaSure1X2 board.

UPDATE rollover_settings
SET default_campaign_stake_ghs = 100, updated_at = NOW()
WHERE id = 1;

UPDATE rollover_runs
SET campaign_stake_ghs = 100
WHERE status = 'active' AND campaign_stake_ghs = 20;
