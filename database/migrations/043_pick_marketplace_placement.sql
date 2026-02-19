-- Add placement column to pick_marketplace (backward compatible)
-- placement: 'marketplace' | 'subscription' | 'both'
-- Existing rows default to 'marketplace'; no behavior change
-- Single-line DO blocks so migration runner (splits on line-ending ;) does not truncate
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pick_marketplace' AND column_name='placement') THEN ALTER TABLE pick_marketplace ADD COLUMN placement VARCHAR(20) DEFAULT 'marketplace'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pick_marketplace' AND column_name='subscription_package_id') THEN ALTER TABLE pick_marketplace ADD COLUMN subscription_package_id INT NULL REFERENCES tipster_subscription_packages(id) ON DELETE SET NULL; END IF; END $$;
