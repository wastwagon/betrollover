-- ============================================
-- Phase 1: Tipsters & Predictions Schema
-- Adds tipsters, predictions, prediction_fixtures,
-- tipster_performance_log, tipster_follows
-- ============================================

-- ============================================
-- TIPSTERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tipsters (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255),
    bio TEXT,

    -- Tipster Type
    is_ai BOOLEAN DEFAULT false,
    tipster_type VARCHAR(20), -- 'ai' or 'human'

    -- AI Personality (for AI tipsters)
    personality_profile JSONB, -- stores strategy, risk level, leagues focus

    -- Stats
    total_predictions INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    roi DECIMAL(8,2) DEFAULT 0, -- Return on Investment %

    -- Performance Metrics
    current_streak INT DEFAULT 0, -- positive for wins, negative for losses
    best_streak INT DEFAULT 0,
    total_profit DECIMAL(10,2) DEFAULT 0, -- in units
    avg_odds DECIMAL(6,2) DEFAULT 0,

    -- Activity
    last_prediction_date TIMESTAMP,
    join_date TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,

    -- Leaderboard
    leaderboard_rank INT,
    monthly_roi DECIMAL(8,2) DEFAULT 0,
    monthly_predictions INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PREDICTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    tipster_id INT NOT NULL REFERENCES tipsters(id) ON DELETE CASCADE,

    -- Prediction Details
    prediction_title VARCHAR(200),
    combined_odds DECIMAL(8,2) NOT NULL,
    stake_units DECIMAL(5,2) DEFAULT 1, -- Recommended stake
    confidence_level VARCHAR(20), -- 'low', 'medium', 'high', 'max'

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'won', 'lost', 'void'

    -- Metadata
    prediction_date DATE NOT NULL,
    posted_at TIMESTAMP DEFAULT NOW(),
    settled_at TIMESTAMP,

    -- Performance
    actual_result DECIMAL(10,2), -- profit/loss in units
    roi_contribution DECIMAL(8,2), -- how this affected tipster ROI

    -- Engagement
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    followers_who_placed INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PREDICTION FIXTURES (2 legs per prediction)
-- ============================================
CREATE TABLE IF NOT EXISTS prediction_fixtures (
    id SERIAL PRIMARY KEY,
    prediction_id INT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,

    -- Match Details (references our fixtures table)
    fixture_id INT NOT NULL REFERENCES fixtures(id) ON DELETE RESTRICT,
    match_date TIMESTAMP NOT NULL,
    league_name VARCHAR(100),
    league_id INT,

    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,

    -- Selection
    selected_outcome VARCHAR(20), -- 'home', 'draw', 'away', 'over2.5', 'btts', etc.
    selection_odds DECIMAL(6,2) NOT NULL,

    -- Result
    result_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'won', 'lost', 'void'
    actual_score VARCHAR(20), -- e.g., "2-1"

    -- AI Confidence
    ai_probability DECIMAL(5,4), -- model's win probability
    expected_value DECIMAL(6,4), -- calculated EV

    leg_number INT, -- 1 or 2 (for 2-fixture accas)

    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TIPSTER PERFORMANCE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS tipster_performance_log (
    id SERIAL PRIMARY KEY,
    tipster_id INT NOT NULL REFERENCES tipsters(id) ON DELETE CASCADE,

    -- Daily snapshot
    snapshot_date DATE NOT NULL,
    total_predictions INT,
    win_rate DECIMAL(5,2),
    roi DECIMAL(8,2),
    current_streak INT,
    total_profit DECIMAL(10,2),

    -- Rankings
    daily_rank INT,
    weekly_rank INT,
    monthly_rank INT,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tipster_id, snapshot_date)
);

-- ============================================
-- USER FOLLOWS (users following tipsters)
-- ============================================
CREATE TABLE IF NOT EXISTS tipster_follows (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipster_id INT NOT NULL REFERENCES tipsters(id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, tipster_id)
);

-- ============================================
-- UPDATED_AT TRIGGER FOR TIPSTERS
-- ============================================
DROP TRIGGER IF EXISTS update_tipsters_updated_at ON tipsters;
CREATE TRIGGER update_tipsters_updated_at
    BEFORE UPDATE ON tipsters
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tipsters_roi ON tipsters(roi DESC);
CREATE INDEX IF NOT EXISTS idx_tipsters_is_ai ON tipsters(is_ai);
CREATE INDEX IF NOT EXISTS idx_tipsters_active ON tipsters(is_active);
CREATE INDEX IF NOT EXISTS idx_tipsters_username ON tipsters(username);

CREATE INDEX IF NOT EXISTS idx_predictions_tipster ON predictions(tipster_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_posted_at ON predictions(posted_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_fixtures_prediction ON prediction_fixtures(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_fixtures_fixture_id ON prediction_fixtures(fixture_id);
CREATE INDEX IF NOT EXISTS idx_prediction_fixtures_status ON prediction_fixtures(result_status);

CREATE INDEX IF NOT EXISTS idx_tipster_performance_tipster ON tipster_performance_log(tipster_id);
CREATE INDEX IF NOT EXISTS idx_tipster_performance_date ON tipster_performance_log(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_tipster_follows_user ON tipster_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_tipster_follows_tipster ON tipster_follows(tipster_id);
