-- Instant Ghana MoMo payouts via Paystack Transfers. Off until a Registered
-- Paystack business is approved (Starter cannot send third-party payouts).
ALTER TABLE paystack_settings
  ADD COLUMN IF NOT EXISTS transfers_enabled BOOLEAN NOT NULL DEFAULT false;
