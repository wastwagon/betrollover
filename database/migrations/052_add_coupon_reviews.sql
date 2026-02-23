-- Migration 052: Coupon reviews — buyers rate tipster coupons after settlement
CREATE TABLE IF NOT EXISTS coupon_reviews (
  id           SERIAL PRIMARY KEY,
  coupon_id    INT NOT NULL REFERENCES accumulator_tickets(id) ON DELETE CASCADE,
  reviewer_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipster_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  is_verified_purchase BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (coupon_id, reviewer_id)   -- one review per buyer per coupon
);

CREATE INDEX IF NOT EXISTS idx_reviews_coupon   ON coupon_reviews(coupon_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tipster  ON coupon_reviews(tipster_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON coupon_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating   ON coupon_reviews(rating);
