-- BetRollover v2 - Comprehensive Seed Data
-- This script populates the database with realistic, diverse data for testing and demonstration
-- Run this after initial schema setup

-- ============================================
-- 1. ADDITIONAL USERS (Tipsters & Regular Users)
-- ============================================
-- Password for all seeded users: "password123" (bcrypt hash with rounds 12)
INSERT INTO users (username, email, password, display_name, role, status, country, timezone, country_code, flag_emoji, is_verified, email_notifications, push_notifications, bio, created_at) VALUES
-- Tipsters
('flygonpriest', 'flygonpriest@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Flygon Priest', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, 'Expert football analyst with 5+ years experience', NOW() - INTERVAL '90 days'),
('wastwagon', 'wastwagon@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Wast Wagon', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, 'Premier League specialist', NOW() - INTERVAL '75 days'),
('dosty', 'dosty@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Dosty', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, 'Champions League expert', NOW() - INTERVAL '60 days'),
('qwerty', 'qwerty@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Qwerty Pro', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, 'Daily accumulator picks', NOW() - INTERVAL '45 days'),
('tipster_master', 'tipster@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Tipster Master', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, 'High-value picks specialist', NOW() - INTERVAL '30 days'),
('cash', 'cash@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Cash King', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, 'Banker picks guaranteed', NOW() - INTERVAL '20 days'),
-- Regular Users
('user1', 'user1@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'John Doe', 'user', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, NULL, NOW() - INTERVAL '80 days'),
('user2', 'user2@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Jane Smith', 'user', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, NULL, NOW() - INTERVAL '70 days'),
('user3', 'user3@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Mike Johnson', 'user', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', false, true, false, NULL, NOW() - INTERVAL '65 days'),
('user4', 'user4@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Sarah Williams', 'user', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, NULL, NOW() - INTERVAL '55 days'),
('user5', 'user5@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'David Brown', 'user', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, false, true, NULL, NOW() - INTERVAL '50 days'),
('user6', 'user6@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Emma Davis', 'user', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, NULL, NOW() - INTERVAL '40 days'),
('user7', 'user7@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Chris Wilson', 'user', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', false, true, true, NULL, NOW() - INTERVAL '35 days'),
('user8', 'user8@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Lisa Anderson', 'user', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true, NULL, NOW() - INTERVAL '30 days'),
('user9', 'user9@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Tom Martinez', 'user', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, false, NULL, NOW() - INTERVAL '25 days'),
('user10', 'user10@example.com', '$2b$12$V7Nd7JYQCuFEF4FK0KnYH.AUwnXC9XQr9gnYX2PNQj1CkFuQIqmCu', 'Amy Taylor', 'user', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, false, true, NULL, NOW() - INTERVAL '20 days')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. WALLETS FOR ALL USERS
-- ============================================
INSERT INTO user_wallets (user_id, balance, currency, status, created_at)
SELECT id, 
  CASE 
    WHEN role = 'tipster' THEN (RANDOM() * 5000 + 1000)::DECIMAL(10,2)
    ELSE (RANDOM() * 2000 + 100)::DECIMAL(10,2)
  END,
  'GHS', 'active', created_at
FROM users
WHERE role IN ('user', 'tipster')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. ACCUMULATOR TICKETS (PICKS)
-- ============================================
-- Get tipster IDs
DO $$
DECLARE
  tipster_ids INTEGER[];
  user_ids INTEGER[];
  ticket_id INTEGER;
  i INTEGER;
  j INTEGER;
  pick_title TEXT;
  pick_status TEXT;
  pick_result TEXT;
  pick_price DECIMAL;
  created_date TIMESTAMP;
BEGIN
  -- Get tipster IDs
  SELECT ARRAY_AGG(id) INTO tipster_ids FROM users WHERE role = 'tipster';
  SELECT ARRAY_AGG(id) INTO user_ids FROM users WHERE role = 'user';
  
  -- Create 100 picks distributed across tipsters
  FOR i IN 1..100 LOOP
    -- Distribute picks: flygonpriest (20), wastwagon (15), dosty (10), qwerty (10), tipster (10), cash (5), others (30)
    IF i <= 20 THEN
      ticket_id := tipster_ids[1]; -- flygonpriest
    ELSIF i <= 35 THEN
      ticket_id := tipster_ids[2]; -- wastwagon
    ELSIF i <= 45 THEN
      ticket_id := tipster_ids[3]; -- dosty
    ELSIF i <= 55 THEN
      ticket_id := tipster_ids[4]; -- qwerty
    ELSIF i <= 65 THEN
      ticket_id := tipster_ids[5]; -- tipster
    ELSIF i <= 70 THEN
      ticket_id := tipster_ids[6]; -- cash
    ELSE
      ticket_id := tipster_ids[1 + (i % array_length(tipster_ids, 1))];
    END IF;
    
    -- Determine status and result
    IF (i % 10) < 4 THEN
      pick_status := 'active';
      pick_result := 'pending';
    ELSIF (i % 10) < 7 THEN
      pick_status := 'won';
      pick_result := 'won';
    ELSE
      pick_status := 'lost';
      pick_result := 'lost';
    END IF;
    
    -- Price distribution: 30% free, 50% paid (5-50), 20% premium (50-200)
    IF (i % 10) < 3 THEN
      pick_price := 0;
    ELSIF (i % 10) < 8 THEN
      pick_price := (RANDOM() * 45 + 5)::DECIMAL(8,2);
    ELSE
      pick_price := (RANDOM() * 150 + 50)::DECIMAL(8,2);
    END IF;
    
    -- Title variety
    CASE (i % 7)
      WHEN 0 THEN pick_title := 'BET OF THE DAY';
      WHEN 1 THEN pick_title := 'DAILY ACCA BET';
      WHEN 2 THEN pick_title := 'SURE WIN';
      WHEN 3 THEN pick_title := 'BANKER PICK';
      WHEN 4 THEN pick_title := 'OVER 2.5 GOALS';
      WHEN 5 THEN pick_title := 'BOTH TEAMS TO SCORE';
      ELSE pick_title := 'WINNER PREDICTION';
    END CASE;
    
    -- Created date spread over last 90 days
    created_date := NOW() - (RANDOM() * 90 || ' days')::INTERVAL;
    
    -- Insert ticket
    INSERT INTO accumulator_tickets (
      user_id, title, description, sport, total_picks, total_odds, price, status, result, 
      is_marketplace, confidence_level, views, purchases, created_at, updated_at
    ) VALUES (
      ticket_id,
      pick_title || ' #' || i,
      'Expert analysis and prediction for today''s matches',
      'Football',
      3 + (RANDOM() * 4)::INTEGER,
      (RANDOM() * 20 + 2)::DECIMAL(10,3),
      pick_price,
      pick_status,
      pick_result,
      pick_price > 0,
      70 + (RANDOM() * 25)::INTEGER,
      (RANDOM() * 200 + 10)::INTEGER,
      CASE WHEN pick_price > 0 THEN (RANDOM() * 15 + 1)::INTEGER ELSE 0 END,
      created_date,
      created_date
    ) RETURNING id INTO ticket_id;
    
    -- Create picks for this ticket (3-6 picks per ticket)
    FOR j IN 1..(3 + (RANDOM() * 4)::INTEGER) LOOP
      INSERT INTO accumulator_picks (
        accumulator_id, match_type, home_team_type, away_team_type, match_description,
        prediction, odds, result, match_date, created_at
      ) VALUES (
        ticket_id,
        CASE WHEN RANDOM() < 0.7 THEN 'league' ELSE 'international' END,
        'club',
        'club',
        'Team A vs Team B',
        CASE (j % 4)
          WHEN 0 THEN 'Home Win'
          WHEN 1 THEN 'Away Win'
          WHEN 2 THEN 'Over 2.5 Goals'
          ELSE 'Both Teams to Score'
        END,
        (RANDOM() * 3 + 1.5)::DECIMAL(10,3),
        CASE 
          WHEN pick_result = 'won' THEN 'won'
          WHEN pick_result = 'lost' THEN 'lost'
          ELSE 'pending'
        END,
        created_date + (RANDOM() * 7 || ' days')::INTERVAL,
        created_date
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 4. MARKETPLACE LISTINGS
-- ============================================
INSERT INTO pick_marketplace (accumulator_id, seller_id, price, status, purchase_count, view_count, max_purchases, created_at, updated_at)
SELECT 
  at.id,
  at.user_id,
  at.price,
  CASE WHEN at.status = 'active' AND at.price > 0 THEN 'active' ELSE 'sold' END,
  at.purchases,
  at.views,
  10 + (RANDOM() * 40)::INTEGER,
  at.created_at,
  at.updated_at
FROM accumulator_tickets at
WHERE at.is_marketplace = true AND at.price > 0
ON CONFLICT (accumulator_id) DO NOTHING;

-- ============================================
-- 5. USER PURCHASES
-- ============================================
DO $$
DECLARE
  purchase_user_id INTEGER;
  purchase_acc_id INTEGER;
  purchase_price DECIMAL;
  purchase_date TIMESTAMP;
  i INTEGER;
  marketplace_picks INTEGER[];
BEGIN
  -- Get marketplace pick IDs
  SELECT ARRAY_AGG(accumulator_id) INTO marketplace_picks FROM pick_marketplace WHERE status = 'active';
  
  -- Create 150 purchases
  FOR i IN 1..150 LOOP
    -- Random user (weighted towards active users)
    SELECT id INTO purchase_user_id FROM users WHERE role = 'user' ORDER BY RANDOM() LIMIT 1;
    
    -- Random marketplace pick
    purchase_acc_id := marketplace_picks[1 + (RANDOM() * (array_length(marketplace_picks, 1) - 1))::INTEGER];
    
    -- Get price
    SELECT price INTO purchase_price FROM accumulator_tickets WHERE id = purchase_acc_id;
    
    -- Purchase date (spread over last 60 days)
    purchase_date := NOW() - (RANDOM() * 60 || ' days')::INTERVAL;
    
    -- Insert purchase (some users buy multiple times)
    INSERT INTO user_purchased_picks (user_id, accumulator_id, purchase_price, purchased_at)
    VALUES (purchase_user_id, purchase_acc_id, purchase_price, purchase_date)
    ON CONFLICT (user_id, accumulator_id) DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- 6. ESCROW FUNDS
-- ============================================
INSERT INTO escrow_funds (user_id, pick_id, amount, reference, status, created_at, updated_at)
SELECT 
  upp.user_id,
  upp.accumulator_id,
  upp.purchase_price,
  'ESC-' || upp.id || '-' || EXTRACT(EPOCH FROM upp.purchased_at)::BIGINT,
  CASE 
    WHEN at.result = 'won' THEN 'released'
    WHEN at.result = 'lost' THEN 'released'
    ELSE 'held'
  END,
  upp.purchased_at,
  CASE 
    WHEN at.result != 'pending' THEN upp.purchased_at + (RANDOM() * 5 || ' days')::INTERVAL
    ELSE upp.purchased_at
  END
FROM user_purchased_picks upp
JOIN accumulator_tickets at ON at.id = upp.accumulator_id
WHERE upp.purchase_price > 0;

-- ============================================
-- 7. WALLET TRANSACTIONS
-- ============================================
-- Deposits
INSERT INTO wallet_transactions (user_id, type, amount, currency, status, reference, description, created_at)
SELECT 
  id,
  'deposit',
  (RANDOM() * 500 + 50)::DECIMAL(10,2),
  'GHS',
  CASE WHEN RANDOM() < 0.9 THEN 'completed' ELSE 'pending' END,
  'DEP-' || id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
  'Initial deposit',
  created_at + (RANDOM() * 5 || ' days')::INTERVAL
FROM users
WHERE role IN ('user', 'tipster');

-- Purchases
INSERT INTO wallet_transactions (user_id, type, amount, currency, status, reference, description, created_at)
SELECT 
  upp.user_id,
  'purchase',
  -upp.purchase_price,
  'GHS',
  'completed',
  'PUR-' || upp.id,
  'Purchase of pick #' || upp.accumulator_id,
  upp.purchased_at
FROM user_purchased_picks upp
WHERE upp.purchase_price > 0;

-- Commissions (for tipsters)
INSERT INTO wallet_transactions (user_id, type, amount, currency, status, reference, description, created_at)
SELECT 
  at.user_id,
  'commission',
  (upp.purchase_price * 0.7)::DECIMAL(10,2), -- 70% commission
  'GHS',
  'completed',
  'COM-' || upp.id,
  'Commission from pick #' || upp.accumulator_id,
  upp.purchased_at + (RANDOM() * 2 || ' days')::INTERVAL
FROM user_purchased_picks upp
JOIN accumulator_tickets at ON at.id = upp.accumulator_id
WHERE upp.purchase_price > 0 AND at.user_id IN (SELECT id FROM users WHERE role = 'tipster');

-- Refunds
INSERT INTO wallet_transactions (user_id, type, amount, currency, status, reference, description, created_at)
SELECT 
  upp.user_id,
  'refund',
  upp.purchase_price,
  'GHS',
  'completed',
  'REF-' || upp.id,
  'Refund for lost pick #' || upp.accumulator_id,
  upp.purchased_at + (RANDOM() * 7 || ' days')::INTERVAL
FROM user_purchased_picks upp
JOIN accumulator_tickets at ON at.id = upp.accumulator_id
WHERE at.result = 'lost' AND upp.purchase_price > 0
LIMIT 20;

-- ============================================
-- 8. DEPOSIT REQUESTS
-- ============================================
INSERT INTO deposit_requests (user_id, reference, amount, currency, status, paystack_reference, created_at, updated_at)
SELECT 
  id,
  'DEP-' || id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
  (RANDOM() * 1000 + 100)::DECIMAL(10,2),
  'GHS',
  CASE WHEN RANDOM() < 0.8 THEN 'completed' WHEN RANDOM() < 0.9 THEN 'pending' ELSE 'failed' END,
  CASE WHEN RANDOM() < 0.8 THEN 'PSK-' || id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT ELSE NULL END,
  created_at + (RANDOM() * 30 || ' days')::INTERVAL,
  created_at + (RANDOM() * 30 || ' days')::INTERVAL
FROM users
WHERE role IN ('user', 'tipster')
LIMIT 30;

-- ============================================
-- 8.5. PAYOUT METHODS (for withdrawals)
-- ============================================
INSERT INTO payout_methods (user_id, type, recipient_code, display_name, account_masked, bank_code, provider, is_default, created_at, updated_at)
SELECT 
  u.id,
  CASE WHEN RANDOM() < 0.7 THEN 'mobile_money' ELSE 'bank' END,
  'RCP_' || u.id || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
  CASE WHEN RANDOM() < 0.7 THEN 'Mobile Money' ELSE 'Bank Account' END,
  CASE WHEN RANDOM() < 0.7 THEN '***' || (RANDOM() * 9999)::INTEGER ELSE NULL END,
  CASE WHEN RANDOM() >= 0.7 THEN 'BANK' || (RANDOM() * 99)::INTEGER ELSE NULL END,
  CASE WHEN RANDOM() < 0.5 THEN 'MTN' WHEN RANDOM() < 0.8 THEN 'Vodafone' ELSE 'AirtelTigo' END,
  true,
  u.created_at + (RANDOM() * 10 || ' days')::INTERVAL,
  u.created_at + (RANDOM() * 10 || ' days')::INTERVAL
FROM users u
WHERE u.role = 'tipster'
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. WITHDRAWAL REQUESTS
-- ============================================
INSERT INTO withdrawal_requests (user_id, payout_method_id, amount, currency, status, reference, paystack_transfer_code, failure_reason, created_at, updated_at)
SELECT 
  u.id,
  pm.id,
  (RANDOM() * 500 + 50)::DECIMAL(10,2),
  'GHS',
  CASE WHEN RANDOM() < 0.7 THEN 'completed' WHEN RANDOM() < 0.85 THEN 'pending' WHEN RANDOM() < 0.95 THEN 'failed' ELSE 'cancelled' END,
  'WTH-' || u.id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
  CASE WHEN RANDOM() < 0.7 THEN 'TRF-' || u.id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT ELSE NULL END,
  CASE WHEN RANDOM() < 0.1 THEN 'Insufficient funds' ELSE NULL END,
  u.created_at + (RANDOM() * 60 || ' days')::INTERVAL,
  u.created_at + (RANDOM() * 60 || ' days')::INTERVAL
FROM users u
JOIN payout_methods pm ON pm.user_id = u.id
WHERE u.role = 'tipster'
LIMIT 25;

-- ============================================
-- 10. NOTIFICATIONS
-- ============================================
INSERT INTO notifications (user_id, type, title, message, link, icon, priority, is_read, read_at, created_at)
SELECT 
  id,
  CASE (RANDOM() * 5)::INTEGER
    WHEN 0 THEN 'pick_approved'
    WHEN 1 THEN 'pick_rejected'
    WHEN 2 THEN 'purchase_confirmed'
    WHEN 3 THEN 'withdrawal_completed'
    ELSE 'tipster_approved'
  END,
  CASE (RANDOM() * 5)::INTEGER
    WHEN 0 THEN 'Pick Approved'
    WHEN 1 THEN 'Pick Rejected'
    WHEN 2 THEN 'Purchase Confirmed'
    WHEN 3 THEN 'Withdrawal Completed'
    ELSE 'Tipster Approved'
  END,
  'Your action has been processed successfully',
  '/dashboard',
  'bell',
  CASE WHEN RANDOM() < 0.2 THEN 'high' WHEN RANDOM() < 0.5 THEN 'medium' ELSE 'low' END,
  RANDOM() < 0.6,
  CASE WHEN RANDOM() < 0.6 THEN created_at + (RANDOM() * 2 || ' days')::INTERVAL ELSE NULL END,
  created_at + (RANDOM() * 30 || ' days')::INTERVAL
FROM users
WHERE role IN ('user', 'tipster')
LIMIT 100;

-- ============================================
-- 11. UPDATE WALLET BALANCES BASED ON TRANSACTIONS
-- ============================================
UPDATE user_wallets uw
SET balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM wallet_transactions wt
  WHERE wt.user_id = uw.user_id AND wt.status = 'completed'
)
WHERE EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = uw.user_id);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Seed data insertion completed successfully!';
  RAISE NOTICE 'Created: Users, Wallets, Picks, Purchases, Transactions, Deposits, Withdrawals, Notifications';
END $$;
