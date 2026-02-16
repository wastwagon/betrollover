\use use co# BetRollover - Database Seeding Strategy

## 🎯 Goal
Populate the database with realistic, diverse data to make the platform appear active and functional for new users.

---

## 📊 Current Database State

### Users
- **Tipsters:** 7 (IDs: 2, 4, 7, 8, 10, 13)
- **Regular Users:** 18 (IDs: 3, 5, 6, 9, 11, 12, 14-24)
- **Admins:** 2 (ID: 1) - **EXCLUDED from stats**

### Current Activity
- **Total Picks:** ~30 accumulator_tickets
- **Active Marketplace Picks:** ~10
- **Purchases:** Minimal
- **Withdrawals:** None visible
- **Refunds:** None visible

---

## 🚀 Seeding Strategy

### 1. **More Picks for Tipsters** 📋

**Goal:** Create 50-100 additional picks distributed across tipsters

**Distribution:**
- **flygonpriest (ID: 7):** 20 picks (most active tipster)
- **wastwagon (ID: 2):** 15 picks
- **Dosty (ID: 8):** 10 picks
- **qwerty (ID: 13):** 10 picks
- **tipster (ID: 4):** 10 picks
- **Cash (ID: 10):** 5 picks

**Pick Types:**
- **Free picks (price = 0):** 30% - For qualification
- **Paid picks (price 5-50 GHS):** 50% - Marketplace items
- **Premium picks (price 50-200 GHS):** 20% - High-value picks

**Status Distribution:**
- **Active (pending):** 40% - Currently available
- **Won:** 35% - Successful picks
- **Lost:** 25% - Failed picks (for realism)

**Titles Variety:**
- "BET OF THE DAY"
- "DAILY ACCA BET"
- "SURE WIN"
- "BANKER PICK"
- "OVER 2.5 GOALS"
- "BOTH TEAMS TO SCORE"
- "WINNER PREDICTION"

---

### 2. **More User Purchases** 🛒

**Goal:** Create 100-200 purchase records

**Distribution:**
- Spread purchases across 10-15 different users
- Mix of different pick prihow ces
- Some users buy multiple picks
- Create "power users" who buy frequently

**Purchase Scenarios:**
- **Single purchase:** 60%
- **Multiple purchases (same user):** 30%
- **Repeat buyers:** 10%

**Price Range:**
- Free picks: 20%
- 5-20 GHS: 40%
- 20-50 GHS: 30%
- 50+ GHS: 10%

---

### 3. **Tipster Withdrawals** 💰

**Goal:** Show tipsters earning and withdrawing money

**Withdrawal Types:**
- **Successful withdrawals:** 70% (completed)
- **Pending withdrawals:** 20% (in process)
- **Failed withdrawals:** 10% (for realism)

**Amount Range:**
- Small: 50-200 GHS (40%)
- Medium: 200-500 GHS (40%)
- Large: 500-2000 GHS (20%)

**Distribution:**
- Top tipsters (flygonpriest, wastwagon): More withdrawals
- New tipsters: Fewer withdrawals

---

### 4. **Refunds** 💸

**Goal:** Show refund system working (when picks lose)

**Refund Scenarios:**
- **Automatic refunds:** When pick loses (80%)
- **Manual refunds:** User requests (15%)
- **Partial refunds:** Special cases (5%)

**Amount Range:**
- Match purchase prices
- Show various refund amounts

**Timing:**
- Some immediate (same day)
- Some delayed (1-3 days)
- Mix of recent and older refunds

---

### 5. **Escrow Transactions** 🔒

**Goal:** Show escrow system activity

**Transaction Types:**
- **Held:** Funds in escrow (40%)
- **Settled:** Funds released to tipster (35%)
- **Refunded:** Funds returned to buyer (25%)

**Amounts:**
- Match purchase prices
- Show escrow protecting various amounts

---

### 6. **Wallet Transactions** 💳

**Goal:** Show user wallet activity

**Transaction Types:**
- **Deposits:** Users adding funds (30%)
- **Purchases:** Buying picks (40%)
- **Refunds:** Getting money back (20%)
- **Withdrawals:** Taking money out (10%)

**Amounts:**
- Various amounts
- Show active wallet usage

---

### 7. **Marketplace Activity** 🏪

**Goal:** Show active marketplace

**Actions:**
- More picks in marketplace
- Higher view counts (10-500 views)
- More purchase counts (1-50 purchases)
- Mix of popular and niche picks

**Popular Picks:**
- Some picks with 50+ views
- Some picks with 10+ purchases
- Create "trending" picks

---

## 📝 Implementation Plan

### Phase 1: Basic Seeding (Quick Win)
1. ✅ Exclude admin users from stats
2. Create 50 picks for tipsters
3. Create 50 purchases
4. Add 20 withdrawals
5. Add 15 refunds

### Phase 2: Advanced Seeding (Full Activity)
1. Add escrow transactions
2. Add wallet transactions
3. Update view/purchase counts
4. Add marketplace entries
5. Create activity logs

### Phase 3: Realistic Distribution
1. Spread dates over last 3 months
2. Create daily activity patterns
3. Show growth over time
4. Mix of old and new activity

---

## 🛠️ Technical Implementation

### Option 1: SQL Seeder Script
- Create `database/seeds/realistic_data.sql`
- Run via phpMyAdmin or command line
- One-time execution
- Easy to review and modify

### Option 2: PHP Seeder Script
- Create `database/seeds/seed_realistic_data.php`
- More flexible
- Can use existing models
- Better error handling

### Option 3: Admin Panel Seeder
- Create admin interface
- Generate data on-demand
- Can regenerate anytime
- More control

---

## 📊 Target Numbers

### After Seeding:

**Users:**
- Tipsters: 7 (no change)
- Regular Users: 18 (no change)
- **Total:** 25 users

**Picks:**
- Total Picks: 80-100
- Active Marketplace: 30-40
- Won Picks: 30-35
- Lost Picks: 20-25

**Activity:**
- Purchases: 100-200
- Withdrawals: 20-30
- Refunds: 15-25
- Escrow Transactions: 100-150
- Wallet Transactions: 200-300

**Marketplace:**
- Average Views: 50-100 per pick
- Average Purchases: 5-10 per pick
- Top Pick Views: 200-500
- Top Pick Purchases: 20-50

---

## ⚠️ Important Considerations

### Data Realism
- ✅ Use realistic dates (spread over 3 months)
- ✅ Use realistic amounts (Ghanaian context)
- ✅ Mix of success/failure
- ✅ Show growth over time

### Data Integrity
- ✅ Maintain foreign key relationships
- ✅ Use existing user IDs
- ✅ Use existing team IDs
- ✅ Valid status values

### Performance
- ✅ Index foreign keys
- ✅ Batch inserts (100-500 per query)
- ✅ Use transactions
- ✅ Test on copy first

---

## 🎯 Expected Impact

### Homepage Stats Will Show:
- **Active Users:** 18 ✅
- **Verified Tipsters:** 7 ✅
- **Total Picks Created:** 80-100 ⬆️
- **Active Picks Available:** 30-40 ⬆️
- **Successful Purchases:** 100-200 ⬆️
- **Win Rate:** 55-65% ⬆️

### User Experience:
- ✅ Platform looks active
- ✅ Shows real activity
- ✅ Builds trust
- ✅ Encourages sign-ups

---

## 🚦 Next Steps

1. **Review this strategy** - Confirm approach
2. **Choose implementation method** - SQL vs PHP
3. **Create seeder script** - Generate realistic data
4. **Test on copy** - Verify data integrity
5. **Run on production** - Deploy seeded data
6. **Monitor stats** - Verify homepage updates

---

**Status:** 📋 **READY FOR DISCUSSION**

**Question:** Which implementation method do you prefer?
- SQL Script (fastest, easiest)
- PHP Script (more flexible)
- Admin Panel (most control)

