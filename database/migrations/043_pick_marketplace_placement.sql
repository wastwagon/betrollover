-- Add placement column to pick_marketplace (backward compatible)
-- placement: 'marketplace' | 'subscription' | 'both'
-- Existing rows default to 'marketplace'; no behavior change
-- Uses ADD COLUMN IF NOT EXISTS (PostgreSQL 9.6+); no DO blocks needed
ALTER TABLE pick_marketplace ADD COLUMN IF NOT EXISTS placement VARCHAR(20) DEFAULT 'marketplace';
ALTER TABLE pick_marketplace ADD COLUMN IF NOT EXISTS subscription_package_id INT NULL REFERENCES tipster_subscription_packages(id) ON DELETE SET NULL;
