-- ============================================
-- Clean Fake/Seed Data
-- Removes wallet balances, picks, purchases, deposits, withdrawals, etc.
-- Keeps: users, tipsters, admin, AI tipster setup
-- Run: docker exec -i betrollover-postgres psql -U betrollover -d betrollover < database/seeds/clean-fake-data.sql
-- ============================================

BEGIN;

-- 1. User-pick relationships and marketplace (order matters for FKs)
DELETE FROM user_purchased_picks;
DELETE FROM pick_marketplace;
DELETE FROM escrow_transactions;
DELETE FROM escrow_funds;
DELETE FROM notifications;

-- 2. Financial records
DELETE FROM wallet_transactions;
DELETE FROM withdrawal_requests;
DELETE FROM deposit_requests;
DELETE FROM payout_methods;

-- 3. Picks (accumulators)
DELETE FROM accumulator_picks;
DELETE FROM accumulator_tickets;

-- 4. Reset all wallet balances to zero
UPDATE user_wallets SET balance = 0, updated_at = NOW();

-- 5. Analytics/visitor data (if any fake sessions)
DELETE FROM visitor_sessions;
DELETE FROM analytics_daily;

COMMIT;
