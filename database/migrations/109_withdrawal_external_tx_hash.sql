-- Optional on-chain / off-platform transfer id when admin completes a manual payout (crypto, bank).
ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS external_tx_hash VARCHAR(128) NULL;

COMMENT ON COLUMN withdrawal_requests.external_tx_hash IS
  'On-chain hash or off-platform transfer id recorded when admin marks a manual payout completed.';
