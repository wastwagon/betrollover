-- Subscription, Push Notifications, In-App Purchase tables
-- All additive; existing features unchanged

-- Tipster subscription packages (tipster defines price, duration, ROI guarantee)
CREATE TABLE IF NOT EXISTS tipster_subscription_packages (
  id SERIAL PRIMARY KEY,
  tipster_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  roi_guarantee_min DECIMAL(6,2) DEFAULT NULL,
  roi_guarantee_enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_pkg_tipster ON tipster_subscription_packages(tipster_user_id);
CREATE INDEX IF NOT EXISTS idx_sub_pkg_status ON tipster_subscription_packages(status);

-- User subscriptions to tipster packages
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id INT NOT NULL REFERENCES tipster_subscription_packages(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_package ON subscriptions(package_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sub_ends_at ON subscriptions(ends_at);

-- Escrow for subscription payments (held until period end; then released or refunded)
CREATE TABLE IF NOT EXISTS subscription_escrow (
  id SERIAL PRIMARY KEY,
  subscription_id INT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'held',
  released_at TIMESTAMP NULL,
  refund_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_escrow_sub ON subscription_escrow(subscription_id);

-- Maps subscription coupons to packages (which coupons subscribers see)
CREATE TABLE IF NOT EXISTS subscription_coupon_access (
  subscription_package_id INT NOT NULL REFERENCES tipster_subscription_packages(id) ON DELETE CASCADE,
  accumulator_id INT NOT NULL REFERENCES accumulator_tickets(id) ON DELETE CASCADE,
  PRIMARY KEY (subscription_package_id, accumulator_id)
);

CREATE INDEX IF NOT EXISTS idx_sub_coupon_pkg ON subscription_coupon_access(subscription_package_id);
CREATE INDEX IF NOT EXISTS idx_sub_coupon_acc ON subscription_coupon_access(accumulator_id);

-- Push device tokens (web + mobile)
CREATE TABLE IF NOT EXISTS push_devices (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  token TEXT NOT NULL,
  device_name VARCHAR(100) NULL,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_devices_user ON push_devices(user_id);

-- In-app purchase records (wallet top-up via Apple/Google)
CREATE TABLE IF NOT EXISTS in_app_purchases (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(10) NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  transaction_id VARCHAR(200) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_iap_user ON in_app_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_iap_transaction ON in_app_purchases(transaction_id);

-- ROI guarantee refund audit trail
CREATE TABLE IF NOT EXISTS roi_guarantee_refunds (
  id SERIAL PRIMARY KEY,
  subscription_id INT NOT NULL REFERENCES subscriptions(id),
  user_id INT NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  roi_achieved DECIMAL(6,2) NULL,
  roi_threshold DECIMAL(6,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roi_refund_sub ON roi_guarantee_refunds(subscription_id);
