-- Payout methods: tipster bank/mobile money details for Paystack transfers
CREATE TABLE IF NOT EXISTS payout_methods (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('mobile_money', 'bank')),
  recipient_code VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  account_masked VARCHAR(50),
  bank_code VARCHAR(20),
  provider VARCHAR(30),
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payout_method_id INT NOT NULL REFERENCES payout_methods(id) ON DELETE RESTRICT,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GHS',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  reference VARCHAR(100) UNIQUE,
  paystack_transfer_code VARCHAR(100),
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_reference ON withdrawal_requests(reference);
