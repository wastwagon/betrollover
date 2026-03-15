-- Google OAuth: allow sign-in/signup with Google (find-or-create by provider_google_id or email)
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_google_id VARCHAR(255) NULL;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_google_id ON users(provider_google_id) WHERE provider_google_id IS NOT NULL;
COMMENT ON COLUMN users.provider_google_id IS 'Google OAuth sub (subject) from ID token; unique per user';
