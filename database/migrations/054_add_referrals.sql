-- Migration 054: Referral / invite system
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(20);

CREATE TABLE IF NOT EXISTS referral_codes (
  id              SERIAL PRIMARY KEY,
  user_id         INT  NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code            VARCHAR(20) NOT NULL UNIQUE,
  total_referrals INT  NOT NULL DEFAULT 0,
  total_credited  DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referral_conversions (
  id               SERIAL PRIMARY KEY,
  referral_code_id INT NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referred_user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  reward_amount    DECIMAL(10,2) NOT NULL DEFAULT 5.00,  -- GHS 5 default reward
  reward_credited  BOOLEAN NOT NULL DEFAULT FALSE,
  first_purchase_at TIMESTAMP,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_conv_code  ON referral_conversions(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_conv_user  ON referral_conversions(referred_user_id);
