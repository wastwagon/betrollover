-- VIP subscribe, admin wallet adjust, referral credit, period-end tipster payout,
-- and score-correction rows (settle_adj) write types the original CHECK did not allow.
-- Production already has settle_adj rows; adding a CHECK without that value crash-loops the API.

ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

-- Trim stray whitespace, then fold any unexpected leftover types so ADD CONSTRAINT cannot fail.
UPDATE wallet_transactions
SET type = BTRIM(type)
WHERE type IS NOT NULL AND type <> BTRIM(type);

UPDATE wallet_transactions
SET type = 'adjustment'
WHERE type::text NOT IN (
  'deposit',
  'withdrawal',
  'purchase',
  'refund',
  'commission',
  'payout',
  'credit',
  'adjustment',
  'subscription',
  'subscription_payout',
  'settle_adj'
);

ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type::text = ANY (ARRAY[
    'deposit'::character varying,
    'withdrawal'::character varying,
    'purchase'::character varying,
    'refund'::character varying,
    'commission'::character varying,
    'payout'::character varying,
    'credit'::character varying,
    'adjustment'::character varying,
    'subscription'::character varying,
    'subscription_payout'::character varying,
    'settle_adj'::character varying
  ]::text[]));
