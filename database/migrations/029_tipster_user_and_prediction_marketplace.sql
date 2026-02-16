-- ============================================
-- Link tipsters to users (for marketplace display)
-- Link pick_marketplace to predictions (for admin price control)
-- ============================================

-- Add user_id to tipsters (nullable for backward compat)
ALTER TABLE tipsters ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tipsters_user_id ON tipsters(user_id);

-- Add prediction_id to pick_marketplace (nullable - only set for AI prediction coupons)
ALTER TABLE pick_marketplace ADD COLUMN IF NOT EXISTS prediction_id INT REFERENCES predictions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pick_marketplace_prediction_id ON pick_marketplace(prediction_id);
