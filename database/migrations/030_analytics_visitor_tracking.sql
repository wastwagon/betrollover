-- ============================================
-- Visitor & analytics tracking for real conversion funnel
-- ============================================

-- Anonymous and logged-in page views / sessions
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  page VARCHAR(255),
  referrer VARCHAR(512),
  user_agent TEXT,
  country VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_session_id ON visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_user_id ON visitor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_created_at ON visitor_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_page ON visitor_sessions(page);

-- Unique visitors per day (for funnel baseline)
CREATE TABLE IF NOT EXISTS analytics_daily (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  unique_visitors INT DEFAULT 0,
  unique_sessions INT DEFAULT 0,
  page_views INT DEFAULT 0,
  registered_users INT DEFAULT 0,
  content_creators INT DEFAULT 0,
  marketplace_sellers INT DEFAULT 0,
  buyers INT DEFAULT 0,
  picks_created INT DEFAULT 0,
  listings_added INT DEFAULT 0,
  purchases INT DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date);
