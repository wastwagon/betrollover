-- Add sport column to news_articles for multi-sport news filtering
-- Existing articles (football transfers/injuries) are backfilled to 'football'

ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS sport VARCHAR(50) NOT NULL DEFAULT 'football';

-- Backfill all existing articles (they are all football transfers/injuries)
UPDATE news_articles SET sport = 'football' WHERE sport = 'football';

CREATE INDEX IF NOT EXISTS idx_news_articles_sport ON news_articles(sport);
