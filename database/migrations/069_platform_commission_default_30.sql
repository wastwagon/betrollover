-- Align platform commission with Terms of Service (30% on winning paid coupons).
-- Existing deployments may still have 10% from migration 051; update to 30 unless admin has customized.

UPDATE api_settings
SET platform_commission_rate = 30.0
WHERE id = 1 AND platform_commission_rate = 10.0;
