-- ============================================
-- Hybrid Prediction System (from football-tipster-hybrid)
-- Adds: predictions.source, generation_logs, admin_actions
-- ============================================

-- Add source column to predictions (api_football vs internal)
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'internal';

COMMENT ON COLUMN predictions.source IS 'api_football = from API-Football predictions endpoint, internal = implied prob from odds';

-- ============================================
-- GENERATION LOGS (track each prediction run)
-- ============================================
CREATE TABLE IF NOT EXISTS generation_logs (
  id SERIAL PRIMARY KEY,
  log_date DATE NOT NULL,
  status VARCHAR(50), -- 'success', 'partial', 'failed', 'skipped'
  predictions_generated INT DEFAULT 0,
  fixtures_analyzed INT DEFAULT 0,
  api_requests_used INT DEFAULT 0,
  errors TEXT,
  execution_time_seconds INT,
  source VARCHAR(50) DEFAULT 'hybrid', -- 'hybrid' | 'internal'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_logs_date ON generation_logs(log_date DESC);

-- ============================================
-- ADMIN ACTIONS LOG (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(50), -- 'approve', 'reject', 'edit', 'disable_tipster', 'manual_result', 'generate_predictions'
  entity_type VARCHAR(50), -- 'prediction', 'tipster', 'system'
  entity_id INT,
  admin_user VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);
