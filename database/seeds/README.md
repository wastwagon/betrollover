# Database Seed Data

This directory contains comprehensive seed data scripts to populate the BetRollover database with realistic, diverse data for testing and demonstration.

## 📋 Files

- **`comprehensive-seed-data.sql`** - Complete seed data script with users, picks, purchases, transactions, and more
- **`ai-tipsters-full-seed.sql`** - 25 AI tipsters: creates users, links to tipsters, creates wallets (idempotent)
- **`news-resources-seed.sql`** - News articles (football news, transfers, rumours, gossip) + Resource Center items (betting education)
- **`fix-news-dates.sql`** - One-time fix: updates news article dates to actual event dates (2023-2025)
- **`clean-fake-data.sql`** - Removes fake/seed data: picks, purchases, deposits, withdrawals, resets wallet balances to 0

### Leagues (API-Football Professional Coverage)

To seed **all professional leagues** from API-Football documentation:

```bash
# 1. Ensure API_SPORTS_KEY or API_FOOTBALL_KEY is in .env
# 2. Run the generator (requires network)
npx ts-node scripts/generate-leagues-migration.ts

# 3. Apply the generated migration
docker compose exec -T postgres psql -U betrollover -d betrollover < database/migrations/026_comprehensive_professional_leagues.sql

# 4. Sync fixtures in Admin → Fixtures → Sync Fixtures
```

The script fetches from API-Football, filters to professional men's leagues + major cups, and outputs `database/migrations/026_comprehensive_professional_leagues.sql`. See `docs/RESTORATION_PLAN.md` for full details.

## 🚀 Usage

### Option 1: Using Docker Compose (Recommended)

```bash
# Make sure Docker services are running
docker compose up -d

# Run the seed script
docker compose exec -T postgres psql -U betrollover -d betrollover < database/seeds/comprehensive-seed-data.sql
```

### Option 2: Direct PostgreSQL Connection

```bash
# Connect to your PostgreSQL database
psql -U betrollover -d betrollover

# Run the seed script
\i database/seeds/comprehensive-seed-data.sql
```

### Option 3: Using psql from Host

```bash
psql -h localhost -U betrollover -d betrollover -f database/seeds/comprehensive-seed-data.sql
```

### AI Tipsters Seed (25 tipsters + users)

```bash
# With Docker
docker exec -i betrollover-postgres psql -U betrollover -d betrollover < database/seeds/ai-tipsters-full-seed.sql

# Or with psql (port 5435)
psql -h localhost -p 5435 -U betrollover -d betrollover -f database/seeds/ai-tipsters-full-seed.sql
```

Creates 25 users (`*@betrollover.internal`), links them to tipsters, syncs display names/bios/avatars from config, and creates user_wallets. Idempotent (safe to re-run).

### News & Resources Seed (Football news + Betting education)

```bash
# With Docker
docker compose exec -T postgres psql -U betrollover -d betrollover < database/seeds/news-resources-seed.sql

# Or with psql
psql -h localhost -p 5435 -U betrollover -d betrollover -f database/seeds/news-resources-seed.sql
```

Populates **12 news articles** (news, transfer rumours, confirmed transfers, gossip) and **11 resource items** (betting education: odds, bankroll, value betting, strategies). Idempotent (ON CONFLICT DO NOTHING).

**Data source:** News is **seeded in your database** (static/curated content). It is **not** loaded from an external API. Articles are served from PostgreSQL. To add fresh content: use Admin → News, or run the API-Football transfers sync script for confirmed transfers.

### API-Football Transfers → News (optional)

To add **confirmed transfers** from API-Football into the news section:

```bash
# 1. Ensure API_SPORTS_KEY is in .env
# 2. Run the sync script (fetches transfers for major clubs)
npx ts-node scripts/sync-transfers-to-news.ts

# 3. Apply the generated SQL
docker compose exec -T postgres psql -U betrollover -d betrollover < database/seeds/transfers-from-api.sql
```

The script fetches current-season transfers for Premier League, La Liga, Serie A, and Bundesliga clubs, then outputs SQL to insert them as `confirmed_transfer` articles.

## 📊 What Gets Seeded

### Users
- **6 Tipsters** with realistic profiles
- **10 Regular Users** with varied activity levels
- All users have wallets with realistic balances

### Picks (Accumulator Tickets)
- **100 picks** distributed across tipsters
- Mix of free, paid (5-50 GHS), and premium (50-200 GHS) picks
- Status distribution: 40% active, 35% won, 25% lost
- Realistic view counts (10-200) and purchase counts

### Purchases
- **150 purchase records** across different users
- Spread over last 60 days
- Mix of single and repeat buyers

### Financial Data
- **30 deposit requests** with various statuses
- **25 withdrawal requests** for tipsters
- **Wallet transactions** for deposits, purchases, commissions, refunds
- **Escrow funds** tracking purchase escrow

### Notifications
- **100 notifications** across users
- Mix of read/unread notifications
- Various notification types

## ⚠️ Important Notes

1. **Password**: All seeded users have password: `password123`
2. **Data Integrity**: The script maintains foreign key relationships
3. **Idempotent**: Uses `ON CONFLICT DO NOTHING` to prevent duplicates
4. **Performance**: Uses batch inserts and transactions for efficiency

## 🔄 Resetting Seed Data

To reset and re-seed:

```bash
# WARNING: This will delete all data except admin users
docker compose exec -T postgres psql -U betrollover -d betrollover << EOF
-- Delete all data (except admin users)
DELETE FROM notifications;
DELETE FROM escrow_funds;
DELETE FROM user_purchased_picks;
DELETE FROM pick_marketplace;
DELETE FROM wallet_transactions;
DELETE FROM withdrawal_requests;
DELETE FROM deposit_requests;
DELETE FROM accumulator_picks;
DELETE FROM accumulator_tickets;
DELETE FROM user_wallets WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin');
DELETE FROM users WHERE role != 'admin';
EOF

# Then run seed script again
docker compose exec -T postgres psql -U betrollover -d betrollover < database/seeds/comprehensive-seed-data.sql
```

## 📈 Expected Results

After seeding, you should see:

- **Users**: ~16 total (6 tipsters + 10 regular users)
- **Picks**: ~100 accumulator tickets
- **Purchases**: ~150 purchase records
- **Revenue**: Realistic revenue from purchases
- **Active Marketplace**: ~30-40 active picks
- **Transactions**: Complete transaction history

## 🎯 Testing Accounts

After seeding, you can test with:

- **Tipster**: `flygonpriest@example.com` / `password123`
- **User**: `user1@example.com` / `password123`
- **Admin**: `admin@betrollover.com` / `password`

## 📝 Customization

To customize the seed data:

1. Edit `comprehensive-seed-data.sql`
2. Adjust quantities, dates, or distributions
3. Re-run the seed script

## 🐛 Troubleshooting

If you encounter errors:

1. **Foreign Key Errors**: Ensure schema is created first (`database/init/01-schema.sql` and `03-core-tables.sql`)
2. **Permission Errors**: Check PostgreSQL user permissions
3. **Connection Errors**: Verify Docker services are running (`docker compose ps`)

## 📚 Related Documentation

- Database Schema: `database/init/01-schema.sql`
- Core Tables: `database/init/03-core-tables.sql`
- Seeding Strategy: `DATABASE_SEEDING_STRATEGY.md`
