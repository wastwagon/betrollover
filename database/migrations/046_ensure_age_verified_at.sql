-- Defensive: ensure age_verified_at exists (fixes 500 if 045 was marked applied without execution)
-- Safe to run multiple times (IF NOT EXISTS). Resolves tipster-requests and impersonate 500s.

ALTER TABLE users ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMP NULL;
