CREATE TABLE IF NOT EXISTS smtp_settings (
  id SERIAL PRIMARY KEY,
  host VARCHAR(255) NOT NULL DEFAULT 'smtp.sendgrid.net',
  port INT NOT NULL DEFAULT 465,
  username VARCHAR(255) NOT NULL DEFAULT 'apikey',
  password VARCHAR(500),
  encryption VARCHAR(20) NOT NULL DEFAULT 'SSL' CHECK (encryption IN ('TLS', 'SSL')),
  from_email VARCHAR(255) NOT NULL DEFAULT 'noreply@betrollover.com',
  from_name VARCHAR(255) NOT NULL DEFAULT 'BetRollover',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO smtp_settings (host, port, username, encryption)
SELECT 'smtp.sendgrid.net', 465, 'apikey', 'SSL'
WHERE NOT EXISTS (SELECT 1 FROM smtp_settings LIMIT 1);

DROP TRIGGER IF EXISTS update_smtp_settings_updated_at ON smtp_settings;
CREATE TRIGGER update_smtp_settings_updated_at
  BEFORE UPDATE ON smtp_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
