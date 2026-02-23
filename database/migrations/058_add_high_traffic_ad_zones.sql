-- Add ad zones for high-traffic user-facing pages
INSERT INTO ad_zones (slug, name, description, width, height) VALUES
  ('dashboard-full', 'Dashboard Full Width', 'User dashboard below header', 728, 90),
  ('tipster-profile-full', 'Tipster Profile Full Width', 'Individual tipster page banner', 728, 90),
  ('tipster-profile-sidebar', 'Tipster Profile Sidebar', 'Tipster profile page sidebar', 300, 250),
  ('my-picks-full', 'My Picks Full Width', 'My picks page banner', 728, 90),
  ('my-purchases-full', 'My Purchases Full Width', 'My purchases page banner', 728, 90),
  ('wallet-full', 'Wallet Full Width', 'Wallet page banner', 728, 90),
  ('create-pick-full', 'Create Pick Full Width', 'Create coupon page banner', 728, 90),
  ('discover-full', 'Discover Full Width', 'Discover page banner', 728, 90),
  ('support-full', 'Support Full Width', 'Support page banner', 728, 90),
  ('coupon-detail-sidebar', 'Coupon Detail Sidebar', 'Individual coupon page sidebar', 300, 250),
  ('coupons-archive-full', 'Coupons Archive Full Width', 'Settled archive page banner', 728, 90),
  ('profile-full', 'Profile Full Width', 'User profile page banner', 728, 90),
  ('tools-converter-full', 'Tools Converter Full Width', 'Currency converter page banner', 728, 90),
  ('invite-full', 'Invite Full Width', 'Referral invite page banner', 728, 90),
  ('earnings-full', 'Earnings Full Width', 'Tipster earnings page banner', 728, 90),
  ('resource-item-full', 'Resource Item Full Width', 'Individual guide/article page banner', 728, 90)
ON CONFLICT (slug) DO NOTHING;
