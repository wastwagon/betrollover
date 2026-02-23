-- Migration 053: Support / dispute tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id                 SERIAL PRIMARY KEY,
  user_id            INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  related_coupon_id  INT REFERENCES accumulator_tickets(id) ON DELETE SET NULL,
  category           VARCHAR(50)  NOT NULL DEFAULT 'general',
  subject            VARCHAR(255) NOT NULL,
  message            TEXT         NOT NULL,
  status             VARCHAR(20)  NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_response     TEXT,
  resolved_by        INT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at        TIMESTAMP,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_user    ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status  ON support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_coupon  ON support_tickets(related_coupon_id);
