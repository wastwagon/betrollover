-- VIP subscribe, admin wallet adjust, referral credit, and period-end tipster payout
-- write wallet_transactions types that the original CHECK did not allow.
ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

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
    'subscription_payout'::character varying
  ]::text[]));
