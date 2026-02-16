-- Smart Coupons table for validated "Smart Double Chance" strategy
-- Tracks generated coupons for high-value doubles (85%+ win rate strategy)

CREATE TABLE IF NOT EXISTS smart_coupons (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  total_odds DECIMAL(8, 3) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  profit DECIMAL(10, 2) DEFAULT 0,
  fixtures JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smart_coupons_date ON smart_coupons(date);
CREATE INDEX IF NOT EXISTS idx_smart_coupons_status ON smart_coupons(status);

COMMENT ON TABLE smart_coupons IS 'Smart Double Chance coupons - 2-pick accas from API-Football advice (DC only, 70%+ confidence)';
