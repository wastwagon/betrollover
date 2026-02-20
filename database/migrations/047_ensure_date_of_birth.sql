-- Add date_of_birth for age verification (users table)
-- Matches User entity dateOfBirth (TypeORM SnakeNamingStrategy → date_of_birth)
-- Fixes 500 on tipster-requests, impersonate when User relation loads this column

ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL;
