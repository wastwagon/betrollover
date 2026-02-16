CREATE TABLE IF NOT EXISTS content_pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  meta_description VARCHAR(500),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_pages_slug ON content_pages(slug);

INSERT INTO content_pages (slug, title, content, meta_description) VALUES
  ('about', 'About BetRollover', 'BetRollover is a verified football tips platform for Ghana. We connect bettors with proven tipsters and protect purchases with escrow. Win or get your money back.', 'Learn about BetRollover - verified football tips with escrow protection.'),
  ('terms', 'Terms of Service', 'By using BetRollover you agree to our terms. Users must be 18+. Gambling responsibly is required. Escrow funds are released per our settlement rules.', 'BetRollover terms of service.'),
  ('privacy', 'Privacy Policy', 'We collect email, display name, and transaction data. We do not sell your data. Payments are processed securely.', 'BetRollover privacy policy.'),
  ('contact', 'Contact Us', 'Email: support@betrollover.com\n\nWe typically respond within 24 hours.', 'Contact BetRollover support.')
ON CONFLICT (slug) DO NOTHING;
