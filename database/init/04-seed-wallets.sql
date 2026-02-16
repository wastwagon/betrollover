-- Create wallet for admin user (id=1) if not exists
INSERT INTO user_wallets (user_id, balance, currency, status)
SELECT 1, 0.00, 'GHS', 'active'
WHERE NOT EXISTS (SELECT 1 FROM user_wallets WHERE user_id = 1);
