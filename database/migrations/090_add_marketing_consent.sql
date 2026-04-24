-- Optional separate marketing consent for compliance preferences
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE;
