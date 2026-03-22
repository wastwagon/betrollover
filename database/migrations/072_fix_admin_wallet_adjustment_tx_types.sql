-- Reclassify admin wallet adjustments that were stored with wrong types:
-- +amount was saved as 'commission' (inflated platform-fee analytics and showed as deductions in UI)
-- -amount was saved as 'payout' with a negative amount (distorted net-earned totals)

UPDATE wallet_transactions
SET type = 'credit',
    reference = COALESCE(NULLIF(TRIM(reference), ''), 'legacy-admin-credit-' || id::text)
WHERE type = 'commission'
  AND amount > 0
  AND (reference IS NULL OR TRIM(reference) = '' OR reference NOT LIKE 'commission-%');

UPDATE wallet_transactions
SET type = 'adjustment',
    reference = COALESCE(NULLIF(TRIM(reference), ''), 'legacy-admin-debit-' || id::text)
WHERE type = 'payout'
  AND amount < 0
  AND (reference IS NULL OR TRIM(reference) = '' OR (reference NOT LIKE 'pick-%' AND reference NOT LIKE 'reconcile-%'));
