-- Sign in with Apple: link user by provider_apple_id (Apple sub from identity token)
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_apple_id VARCHAR(255) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_apple_id ON users(provider_apple_id) WHERE provider_apple_id IS NOT NULL;
COMMENT ON COLUMN users.provider_apple_id IS 'Apple OAuth sub from identity token; unique per user';
