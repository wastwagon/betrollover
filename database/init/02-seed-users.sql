-- Seed admin user (password: password)
INSERT INTO users (username, email, password, display_name, role, status, country, timezone, country_code, flag_emoji, is_verified, email_notifications, push_notifications)
SELECT 'admin', 'admin@betrollover.com', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Administrator', 'admin', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@betrollover.com');

-- Seed tipster user (password: password)
INSERT INTO users (username, email, password, display_name, role, status, country, timezone, country_code, flag_emoji, is_verified, email_notifications, push_notifications)
SELECT 'tipster', 'tipster@betrollover.com', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Tipster Demo', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'tipster@betrollover.com');
