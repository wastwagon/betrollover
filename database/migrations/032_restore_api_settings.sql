-- ============================================
-- Restore full API settings
-- Ensure api_settings has minimum_roi and default row
-- ============================================

-- Add minimum_roi if missing
ALTER TABLE api_settings 
ADD COLUMN IF NOT EXISTS minimum_roi DECIMAL(5,2) DEFAULT 20.0;

-- Ensure default row exists
INSERT INTO api_settings (id, api_sports_key, is_active, minimum_roi)
SELECT 1, NULL, false, 20.0
WHERE NOT EXISTS (SELECT 1 FROM api_settings WHERE id = 1);

-- Set default minimum ROI for existing row
UPDATE api_settings 
SET minimum_roi = COALESCE(minimum_roi, 20.0)
WHERE id = 1;
