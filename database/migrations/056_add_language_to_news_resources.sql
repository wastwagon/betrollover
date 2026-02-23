-- Add optional language support for news articles and resource items
-- Editors can create French versions; API filters by Accept-Language / x-locale
-- Default 'en' for existing content; fallback to English when French not available

-- News articles: add language column, update unique constraint
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';
ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_articles_slug_language ON news_articles(slug, language);
CREATE INDEX IF NOT EXISTS idx_news_articles_language ON news_articles(language);

-- Resource items: add language column, update unique constraint
ALTER TABLE resource_items ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';
ALTER TABLE resource_items DROP CONSTRAINT IF EXISTS resource_items_category_id_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_items_category_slug_language ON resource_items(category_id, slug, language);
CREATE INDEX IF NOT EXISTS idx_resource_items_language ON resource_items(language);

-- Resource categories: add language for category names/descriptions (optional)
ALTER TABLE resource_categories ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';
