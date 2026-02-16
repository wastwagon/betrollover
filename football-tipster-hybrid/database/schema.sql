-- ============================================
-- Football Tipster Platform - Database Schema
-- ============================================

-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS generation_logs CASCADE;
DROP TABLE IF EXISTS daily_performance CASCADE;
DROP TABLE IF EXISTS prediction_fixtures CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS tipsters CASCADE;

-- ============================================
-- TIPSTERS TABLE
-- ============================================
CREATE TABLE tipsters (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255),
    bio TEXT,
    
    -- Tipster Type
    is_ai BOOLEAN DEFAULT true,
    strategy_type VARCHAR(50), -- 'conservative', 'balanced', 'aggressive', 'specialist', 'value_hunter'
    
    -- Performance Stats
    total_predictions INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    roi DECIMAL(8,2) DEFAULT 0, -- Return on Investment %
    
    -- Tracking
    current_streak INT DEFAULT 0, -- positive for wins, negative for losses
    best_streak INT DEFAULT 0,
    total_profit DECIMAL(10,2) DEFAULT 0, -- in units
    avg_odds DECIMAL(6,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_prediction_date DATE,
    join_date TIMESTAMP DEFAULT NOW(),
    
    -- Leaderboard
    leaderboard_rank INT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PREDICTIONS TABLE
-- ============================================
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    tipster_id INT REFERENCES tipsters(id) ON DELETE CASCADE,
    
    -- Prediction Details
    prediction_title VARCHAR(255),
    combined_odds DECIMAL(8,2) NOT NULL,
    confidence_level VARCHAR(20), -- 'medium', 'high', 'very_high'
    
    -- Source
    source VARCHAR(50) DEFAULT 'api_football', -- Tracks prediction source
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'won', 'lost', 'void'
    
    -- Dates
    prediction_date DATE NOT NULL,
    posted_at TIMESTAMP DEFAULT NOW(),
    settled_at TIMESTAMP,
    
    -- Performance
    actual_result DECIMAL(10,2), -- profit/loss in units
    
    -- Engagement
    views INT DEFAULT 0,
    
    -- Manual Curation
    is_approved BOOLEAN DEFAULT true,
    approved_by VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PREDICTION FIXTURES (2 legs per prediction)
-- ============================================
CREATE TABLE prediction_fixtures (
    id SERIAL PRIMARY KEY,
    prediction_id INT REFERENCES predictions(id) ON DELETE CASCADE,
    
    -- Match Details (from API-Football)
    fixture_id INT NOT NULL,
    match_date TIMESTAMP NOT NULL,
    league_name VARCHAR(100),
    league_id INT,
    
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    
    -- Selection
    selected_outcome VARCHAR(20), -- 'home', 'draw', 'away'
    selection_odds DECIMAL(6,2) NOT NULL,
    
    -- Result
    result_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'won', 'lost', 'void'
    actual_score VARCHAR(20), -- e.g., "2-1"
    
    -- AI Confidence from API-Football
    api_probability DECIMAL(5,4), -- API-Football's win probability
    
    -- Value Calculation
    expected_value DECIMAL(6,4), -- Calculated EV
    
    leg_number INT, -- 1 or 2 (for 2-fixture accas)
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DAILY PERFORMANCE TRACKING
-- ============================================
CREATE TABLE daily_performance (
    id SERIAL PRIMARY KEY,
    tipster_id INT REFERENCES tipsters(id) ON DELETE CASCADE,
    
    -- Daily Snapshot
    snapshot_date DATE NOT NULL,
    predictions_count INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    win_rate DECIMAL(5,2),
    roi DECIMAL(8,2),
    profit DECIMAL(10,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(tipster_id, snapshot_date)
);

-- ============================================
-- GENERATION LOGS
-- ============================================
CREATE TABLE generation_logs (
    id SERIAL PRIMARY KEY,
    log_date DATE NOT NULL,
    status VARCHAR(50), -- 'success', 'partial', 'failed', 'skipped'
    predictions_generated INT DEFAULT 0,
    fixtures_analyzed INT DEFAULT 0,
    api_requests_used INT DEFAULT 0,
    errors TEXT,
    execution_time_seconds INT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ADMIN ACTIONS LOG
-- ============================================
CREATE TABLE admin_actions (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50), -- 'approve', 'reject', 'edit', 'disable_tipster', 'manual_result'
    entity_type VARCHAR(50), -- 'prediction', 'tipster', 'system'
    entity_id INT,
    admin_user VARCHAR(100),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_predictions_tipster ON predictions(tipster_id);
CREATE INDEX idx_predictions_status ON predictions(status);
CREATE INDEX idx_predictions_date ON predictions(prediction_date DESC);
CREATE INDEX idx_fixtures_prediction ON prediction_fixtures(prediction_id);
CREATE INDEX idx_fixtures_fixture_id ON prediction_fixtures(fixture_id);
CREATE INDEX idx_fixtures_status ON prediction_fixtures(result_status);
CREATE INDEX idx_tipsters_active ON tipsters(is_active);
CREATE INDEX idx_tipsters_roi ON tipsters(roi DESC);
CREATE INDEX idx_tipsters_username ON tipsters(username);
CREATE INDEX idx_daily_perf_tipster_date ON daily_performance(tipster_id, snapshot_date DESC);

-- ============================================
-- INITIAL DATA (Optional - can remove if not needed)
-- ============================================

-- You can add any initial data here
-- For example, admin user, default settings, etc.

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active Tipsters Leaderboard
CREATE OR REPLACE VIEW v_leaderboard AS
SELECT 
    id,
    username,
    display_name,
    avatar_url,
    total_predictions,
    total_wins,
    total_losses,
    win_rate,
    roi,
    current_streak,
    total_profit,
    avg_odds,
    ROW_NUMBER() OVER (ORDER BY roi DESC) as rank
FROM tipsters
WHERE is_active = true
AND total_predictions >= 5
ORDER BY roi DESC;

-- Today's Predictions Summary
CREATE OR REPLACE VIEW v_todays_predictions AS
SELECT 
    p.id,
    p.prediction_title,
    p.combined_odds,
    p.confidence_level,
    p.status,
    t.username,
    t.display_name,
    t.avatar_url,
    t.roi,
    t.win_rate,
    p.created_at
FROM predictions p
JOIN tipsters t ON p.tipster_id = t.id
WHERE p.prediction_date = CURRENT_DATE
ORDER BY p.combined_odds ASC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update tipster stats (called after result settlement)
CREATE OR REPLACE FUNCTION update_tipster_stats(p_tipster_id INT)
RETURNS VOID AS $$
BEGIN
    UPDATE tipsters
    SET 
        total_predictions = (
            SELECT COUNT(*) FROM predictions 
            WHERE tipster_id = p_tipster_id 
            AND status IN ('won', 'lost')
        ),
        total_wins = (
            SELECT COUNT(*) FROM predictions 
            WHERE tipster_id = p_tipster_id 
            AND status = 'won'
        ),
        total_losses = (
            SELECT COUNT(*) FROM predictions 
            WHERE tipster_id = p_tipster_id 
            AND status = 'lost'
        ),
        win_rate = (
            SELECT CASE 
                WHEN COUNT(*) = 0 THEN 0
                ELSE (COUNT(*) FILTER (WHERE status = 'won')::DECIMAL / COUNT(*)::DECIMAL) * 100
            END
            FROM predictions 
            WHERE tipster_id = p_tipster_id 
            AND status IN ('won', 'lost')
        ),
        total_profit = (
            SELECT COALESCE(SUM(actual_result), 0)
            FROM predictions
            WHERE tipster_id = p_tipster_id
            AND status IN ('won', 'lost')
        ),
        roi = (
            SELECT CASE 
                WHEN COUNT(*) = 0 THEN 0
                ELSE (COALESCE(SUM(actual_result), 0) / COUNT(*)::DECIMAL) * 100
            END
            FROM predictions
            WHERE tipster_id = p_tipster_id
            AND status IN ('won', 'lost')
        ),
        avg_odds = (
            SELECT COALESCE(AVG(combined_odds), 0)
            FROM predictions
            WHERE tipster_id = p_tipster_id
            AND status IN ('won', 'lost')
        ),
        updated_at = NOW()
    WHERE id = p_tipster_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPLETED
-- ============================================

-- Verify schema creation
SELECT 'Database schema created successfully!' as status;
