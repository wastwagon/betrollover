-- News, Resource Center, Ads Manager
-- Phase 1: News articles (admin-managed)
CREATE TABLE IF NOT EXISTS news_articles (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  category VARCHAR(50) NOT NULL DEFAULT 'news' CHECK (category IN ('news', 'transfer_rumour', 'confirmed_transfer', 'gossip')),
  image_url VARCHAR(500),
  source_url VARCHAR(500),
  featured BOOLEAN DEFAULT false,
  meta_description VARCHAR(500),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_articles_slug ON news_articles(slug);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at DESC);

DROP TRIGGER IF EXISTS update_news_articles_updated_at ON news_articles;
CREATE TRIGGER update_news_articles_updated_at
  BEFORE UPDATE ON news_articles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Resource Center (articles, strategies, tools - no videos)
CREATE TABLE IF NOT EXISTS resource_categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  level VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resource_items (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES resource_categories(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  type VARCHAR(20) NOT NULL DEFAULT 'article' CHECK (type IN ('article', 'strategy', 'tool')),
  duration_minutes INT,
  tool_config JSONB,
  featured BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_resource_items_category ON resource_items(category_id);
CREATE INDEX IF NOT EXISTS idx_resource_items_type ON resource_items(type);
CREATE INDEX IF NOT EXISTS idx_resource_items_published ON resource_items(published_at DESC);

DROP TRIGGER IF EXISTS update_resource_categories_updated_at ON resource_categories;
CREATE TRIGGER update_resource_categories_updated_at
  BEFORE UPDATE ON resource_categories
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_resource_items_updated_at ON resource_items;
CREATE TRIGGER update_resource_items_updated_at
  BEFORE UPDATE ON resource_items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Ads Manager
CREATE TABLE IF NOT EXISTS ad_zones (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  width INT DEFAULT 300,
  height INT DEFAULT 250,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id SERIAL PRIMARY KEY,
  zone_id INT NOT NULL REFERENCES ad_zones(id) ON DELETE CASCADE,
  advertiser_name VARCHAR(255) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  target_url VARCHAR(500) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_zone ON ad_campaigns(zone_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates ON ad_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);

DROP TRIGGER IF EXISTS update_ad_zones_updated_at ON ad_zones;
CREATE TRIGGER update_ad_zones_updated_at
  BEFORE UPDATE ON ad_zones
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_ad_campaigns_updated_at ON ad_campaigns;
CREATE TRIGGER update_ad_campaigns_updated_at
  BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Seed ad zones
INSERT INTO ad_zones (slug, name, description, width, height) VALUES
  ('sidebar', 'Sidebar', 'Right sidebar on desktop', 300, 250),
  ('home-below-hero', 'Home Below Hero', 'Below hero section on homepage', 728, 90),
  ('between-sections', 'Between Sections', 'Mid-page between content sections', 728, 90),
  ('footer', 'Footer', 'Above footer site-wide', 728, 90),
  ('marketplace-sidebar', 'Marketplace Sidebar', 'Marketplace page sidebar', 300, 250),
  ('news-sidebar', 'News Sidebar', 'News page sidebar', 300, 250),
  ('resource-sidebar', 'Resource Sidebar', 'Resource Center sidebar', 300, 250)
ON CONFLICT (slug) DO NOTHING;

-- Seed resource categories
INSERT INTO resource_categories (slug, name, description, level, sort_order) VALUES
  ('beginner', 'Beginner', 'Start your betting education', 'beginner', 1),
  ('intermediate', 'Intermediate', 'Build on your knowledge', 'intermediate', 2),
  ('advanced', 'Advanced', 'Master the strategies', 'advanced', 3)
ON CONFLICT (slug) DO NOTHING;
