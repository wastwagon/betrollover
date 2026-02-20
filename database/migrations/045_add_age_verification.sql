-- Add age verification column for 18+ compliance (users table)
-- Matches User entity ageVerifiedAt (TypeORM SnakeNamingStrategy → age_verified_at)

ALTER TABLE users ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMP NULL;
