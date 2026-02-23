-- Migration: Convert all users to tipsters
-- This migration converts all users with role 'user' to 'tipster'
-- All users can now create picks and make earnings

-- Update all users to tipster role
UPDATE users 
SET role = 'tipster' 
WHERE role = 'user';

-- Add minimum_roi column to api_settings if it doesn't exist
ALTER TABLE api_settings 
ADD COLUMN IF NOT EXISTS minimum_roi DECIMAL(5,2) DEFAULT 20.0;

-- Set default minimum ROI if not set
UPDATE api_settings 
SET minimum_roi = 20.0 
WHERE id = 1 AND minimum_roi IS NULL;

-- Verify the changes
SELECT 
    role, 
    COUNT(*) as count 
FROM users 
GROUP BY role;
