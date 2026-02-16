-- Fix news article dates to use actual event dates (2023-2025)
-- Run: docker compose exec -T postgres psql -U betrollover -d betrollover < database/seeds/fix-news-dates.sql

UPDATE news_articles SET published_at = '2025-04-20 14:00:00' WHERE slug = 'premier-league-title-race-heats-up';
UPDATE news_articles SET published_at = '2024-12-15 10:00:00' WHERE slug = 'africa-cup-of-nations-2025-preview';
UPDATE news_articles SET published_at = '2024-12-18 12:00:00' WHERE slug = 'champions-league-knockout-draw-reaction';
UPDATE news_articles SET published_at = '2025-01-10 16:00:00' WHERE slug = 'ghana-premier-league-midseason-review';
UPDATE news_articles SET published_at = '2024-05-15 09:00:00' WHERE slug = 'mbappe-real-madrid-latest';
UPDATE news_articles SET published_at = '2025-01-25 11:00:00' WHERE slug = 'salah-saudi-arabia-january';
UPDATE news_articles SET published_at = '2025-05-20 14:00:00' WHERE slug = 'osimhen-chelsea-arsenal-race';
UPDATE news_articles SET published_at = '2023-06-14 12:00:00' WHERE slug = 'bellingham-real-madrid-complete';
UPDATE news_articles SET published_at = '2023-07-15 10:00:00' WHERE slug = 'rice-arsenal-official';
UPDATE news_articles SET published_at = '2023-08-12 15:00:00' WHERE slug = 'kane-bayern-munich-announced';
UPDATE news_articles SET published_at = '2024-11-10 09:00:00' WHERE slug = 'premier-league-managers-hot-seat';
UPDATE news_articles SET published_at = '2025-06-01 12:00:00' WHERE slug = 'african-stars-european-interest';
