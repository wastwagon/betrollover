-- Enforce paid-only active VIP packages.
-- Existing active rows with non-positive price are deactivated for safety.

UPDATE tipster_subscription_packages
SET status = 'inactive'
WHERE status = 'active'
  AND COALESCE(price, 0) <= 0;

ALTER TABLE tipster_subscription_packages
  DROP CONSTRAINT IF EXISTS chk_tipster_subscription_packages_active_price_positive;

ALTER TABLE tipster_subscription_packages
  ADD CONSTRAINT chk_tipster_subscription_packages_active_price_positive
  CHECK (status <> 'active' OR price > 0);
