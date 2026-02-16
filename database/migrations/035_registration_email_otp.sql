-- Email OTP for registration (replaces phone OTP)
CREATE TABLE IF NOT EXISTS registration_otps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registration_otps_email ON registration_otps(email);
CREATE INDEX IF NOT EXISTS idx_registration_otps_expires ON registration_otps(expires_at);

COMMENT ON TABLE registration_otps IS 'Temporary OTP codes for email verification at registration; cleaned up after use or expiry';
