-- BetRollover v2 - Core Tables (PostgreSQL)
-- accumulator_tickets, accumulator_picks, user_wallets, wallet_transactions, escrow, pick_marketplace, notifications

-- Countries (minimal for teams reference)
CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(3) NOT NULL UNIQUE,
  flag_emoji VARCHAR(10)
);

-- Accumulator tickets (bets/accumulators created by users)
CREATE TABLE IF NOT EXISTS accumulator_tickets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_id INT REFERENCES users(id) ON DELETE SET NULL,
  purchase_price DECIMAL(10,2),
  purchased_at TIMESTAMP,
  settled_at TIMESTAMP,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  sport VARCHAR(100) DEFAULT 'Football',
  home_country_id INT REFERENCES countries(id),
  home_team_id INT,
  away_country_id INT REFERENCES countries(id),
  away_team_id INT,
  total_picks INT NOT NULL DEFAULT 1,
  total_odds DECIMAL(10,3) NOT NULL DEFAULT 1.000,
  price DECIMAL(8,2) DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('active','won','lost','void','pending','cancelled','pending_approval')),
  result VARCHAR(20) DEFAULT 'pending' CHECK (result IN ('pending','won','lost','void')),
  is_marketplace BOOLEAN DEFAULT false,
  confidence_level INT DEFAULT 75,
  views INT DEFAULT 0,
  purchases INT DEFAULT 0,
  like_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_acc_user_id ON accumulator_tickets(user_id);
CREATE INDEX idx_acc_status ON accumulator_tickets(status);
CREATE INDEX idx_acc_is_marketplace ON accumulator_tickets(is_marketplace);
CREATE INDEX idx_acc_created_at ON accumulator_tickets(created_at);

-- Accumulator picks (individual selections within a ticket)
CREATE TABLE IF NOT EXISTS accumulator_picks (
  id SERIAL PRIMARY KEY,
  accumulator_id INT NOT NULL REFERENCES accumulator_tickets(id) ON DELETE CASCADE,
  match_type VARCHAR(20) DEFAULT 'league' CHECK (match_type IN ('league','international')),
  home_team_type VARCHAR(20) DEFAULT 'club' CHECK (home_team_type IN ('club','national')),
  away_team_type VARCHAR(20) DEFAULT 'club' CHECK (away_team_type IN ('club','national')),
  match_description VARCHAR(255) NOT NULL,
  prediction VARCHAR(100) NOT NULL,
  odds DECIMAL(10,3) NOT NULL,
  result VARCHAR(20) DEFAULT 'pending' CHECK (result IN ('pending','won','lost','void')),
  match_date TIMESTAMP,
  match_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_acc_picks_accumulator ON accumulator_picks(accumulator_id);

-- User wallets
CREATE TABLE IF NOT EXISTS user_wallets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'GHS',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','frozen','suspended')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_user ON user_wallets(user_id);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit','withdrawal','purchase','refund','commission','payout')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GHS',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','cancelled')),
  reference VARCHAR(100),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_tx_created ON wallet_transactions(created_at);

-- Escrow funds (for marketplace purchases - holds buyer funds until pick settles)
CREATE TABLE IF NOT EXISTS escrow_funds (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pick_id INT NOT NULL REFERENCES accumulator_tickets(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reference VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'held' CHECK (status IN ('held','released','refunded')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_escrow_user ON escrow_funds(user_id);
CREATE INDEX idx_escrow_pick ON escrow_funds(pick_id);

-- Escrow transactions (settlement tracking)
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accumulator_id INT NOT NULL REFERENCES accumulator_tickets(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','settled','refunded')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMP,
  refunded_at TIMESTAMP,
  settlement_reason TEXT
);

CREATE INDEX idx_escrow_tx_user ON escrow_transactions(user_id);
CREATE INDEX idx_escrow_tx_accumulator ON escrow_transactions(accumulator_id);

-- Pick marketplace (accumulators listed for sale)
CREATE TABLE IF NOT EXISTS pick_marketplace (
  id SERIAL PRIMARY KEY,
  accumulator_id INT NOT NULL UNIQUE REFERENCES accumulator_tickets(id) ON DELETE CASCADE,
  seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price DECIMAL(8,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','sold','removed','expired')),
  purchase_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  max_purchases INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_seller ON pick_marketplace(seller_id);
CREATE INDEX idx_marketplace_status ON pick_marketplace(status);

-- User purchased picks (tracks who bought what)
CREATE TABLE IF NOT EXISTS user_purchased_picks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accumulator_id INT NOT NULL REFERENCES accumulator_tickets(id) ON DELETE CASCADE,
  purchase_price DECIMAL(10,2) NOT NULL,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, accumulator_id)
);

CREATE INDEX idx_purchased_user ON user_purchased_picks(user_id);
CREATE INDEX idx_purchased_accumulator ON user_purchased_picks(accumulator_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  icon VARCHAR(50) DEFAULT 'bell',
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_is_read ON notifications(is_read);
CREATE INDEX idx_notif_created ON notifications(created_at);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_accumulator_tickets_updated_at ON accumulator_tickets;
CREATE TRIGGER update_accumulator_tickets_updated_at
  BEFORE UPDATE ON accumulator_tickets
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_accumulator_picks_updated_at ON accumulator_picks;
CREATE TRIGGER update_accumulator_picks_updated_at
  BEFORE UPDATE ON accumulator_picks
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_wallets_updated_at ON user_wallets;
CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON user_wallets
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallet_transactions_updated_at ON wallet_transactions;
CREATE TRIGGER update_wallet_transactions_updated_at
  BEFORE UPDATE ON wallet_transactions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_escrow_funds_updated_at ON escrow_funds;
CREATE TRIGGER update_escrow_funds_updated_at
  BEFORE UPDATE ON escrow_funds
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_pick_marketplace_updated_at ON pick_marketplace;
CREATE TRIGGER update_pick_marketplace_updated_at
  BEFORE UPDATE ON pick_marketplace
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
