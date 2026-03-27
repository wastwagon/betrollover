-- Audit columns for VIP subscription escrow: rate at purchase, actual split at release.
ALTER TABLE subscription_escrow
  ADD COLUMN IF NOT EXISTS commission_rate_percent_at_purchase DECIMAL(5,2) NULL,
  ADD COLUMN IF NOT EXISTS released_tipster_net DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS released_platform_fee DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS released_commission_rate_percent DECIMAL(5,2) NULL;
