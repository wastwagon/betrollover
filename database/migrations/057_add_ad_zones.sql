-- Add new ad zones for community, marketplace, leaderboard, tipsters, and full-width placements
-- Note: marketplace-sidebar, resource-sidebar, guides-sidebar already exist in 036
INSERT INTO ad_zones (slug, name, description, width, height) VALUES
  ('community-sidebar', 'Community Sidebar', 'Below community rules in chat sidebar', 300, 250),
  ('community-chat-right', 'Community Chat Right', 'Right side of chat area on desktop', 300, 600),
  ('community-above-input', 'Community Above Input', 'Full-width banner above message input', 728, 90),
  ('marketplace-full', 'Marketplace Full Width', 'Full-width banner on marketplace', 728, 90),
  ('leaderboard-sidebar', 'Leaderboard Sidebar', 'Leaderboard page sidebar', 300, 250),
  ('leaderboard-full', 'Leaderboard Full Width', 'Full-width banner on leaderboard', 728, 90),
  ('tipsters-sidebar', 'Tipsters Sidebar', 'Tipsters page sidebar', 300, 250),
  ('tipsters-full', 'Tipsters Full Width', 'Full-width banner on tipsters', 728, 90),
  ('guides-sidebar', 'Guides Sidebar', 'Resource Center / Guides sidebar', 300, 250),
  ('news-article-sidebar', 'News Article Sidebar', 'Individual news article page sidebar', 300, 250)
ON CONFLICT (slug) DO NOTHING;
