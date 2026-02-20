-- Manual, crypto payout methods and withdrawal status enhancements
-- Supports global bank accounts, cryptocurrency, and admin-manual processing

ALTER TABLE payout_methods ADD COLUMN IF NOT EXISTS country VARCHAR(10);
ALTER TABLE payout_methods ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GHS';
ALTER TABLE payout_methods ADD COLUMN IF NOT EXISTS manual_details TEXT;

ALTER TABLE payout_methods DROP CONSTRAINT IF EXISTS payout_methods_type_check;
ALTER TABLE payout_methods ADD CONSTRAINT payout_methods_type_check
  CHECK (type IN ('mobile_money', 'bank', 'manual', 'crypto'));

ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check;
ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
