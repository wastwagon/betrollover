-- Email verification for users (block wallet/tipster until verified)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64) NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;

COMMENT ON COLUMN users.email_verified_at IS 'When user verified their email; NULL = not verified';
COMMENT ON COLUMN users.email_verification_token IS 'Token sent in verification email; cleared after verification';
