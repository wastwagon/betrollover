-- Performance Indexes for World-Class Settlement & Fixture Management
-- These indexes optimize queries for:
-- 1. Fast fixture lookups by API ID
-- 2. Quick settlement checks (pending picks with finished fixtures)
-- 3. Efficient marketplace queries
-- 4. Fast tipster performance calculations

-- Fixtures: API ID lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_fixtures_api_id ON fixtures(api_id);

-- Fixtures: Status and date for settlement queries
CREATE INDEX IF NOT EXISTS idx_fixtures_status_date ON fixtures(status, match_date) WHERE status IN ('FT', '1H', 'HT', '2H', 'ET', 'BT', 'P');

-- Fixtures: Synced timestamp for update optimization
CREATE INDEX IF NOT EXISTS idx_fixtures_synced_at ON fixtures(synced_at) WHERE synced_at IS NOT NULL;

-- Accumulator Picks: Fixture ID and result for settlement
CREATE INDEX IF NOT EXISTS idx_accumulator_picks_fixture_result ON accumulator_picks(fixture_id, result) WHERE fixture_id IS NOT NULL AND result = 'pending';

-- Accumulator Picks: Accumulator ID for ticket settlement
CREATE INDEX IF NOT EXISTS idx_accumulator_picks_accumulator_id ON accumulator_picks(accumulator_id);

-- Accumulator Tickets: Status and result for settlement
CREATE INDEX IF NOT EXISTS idx_accumulator_tickets_status_result ON accumulator_tickets(status, result) WHERE result = 'pending';

-- Accumulator Tickets: User ID for tipster performance
CREATE INDEX IF NOT EXISTS idx_accumulator_tickets_user_result ON accumulator_tickets(user_id, result);

-- Marketplace: Active picks query
CREATE INDEX IF NOT EXISTS idx_pick_marketplace_status ON pick_marketplace(status) WHERE status = 'active';

-- User Purchased Picks: User and accumulator lookup
CREATE INDEX IF NOT EXISTS idx_user_purchased_picks_user_acc ON user_purchased_picks(user_id, accumulator_id);

-- Escrow Funds: Settlement queries
CREATE INDEX IF NOT EXISTS idx_escrow_funds_status ON escrow_funds(status) WHERE status = 'pending';

-- Composite index for common settlement query pattern
CREATE INDEX IF NOT EXISTS idx_fixtures_status_scores ON fixtures(status, home_score, away_score) 
  WHERE status = 'FT' AND home_score IS NOT NULL AND away_score IS NOT NULL;
