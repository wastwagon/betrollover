-- Optional email for admin communication (e.g. when user signs in with Apple "Hide My Email")
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255) NULL;
COMMENT ON COLUMN users.contact_email IS 'Email for admin communication; user can set in profile (e.g. when account uses Apple private relay)';
