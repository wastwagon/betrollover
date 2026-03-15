-- Admin audit log for sensitive actions (role change, withdrawal status, support resolve, content update)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id                SERIAL PRIMARY KEY,
  admin_id          INT NOT NULL REFERENCES users(id),
  action            VARCHAR(80) NOT NULL,
  target_type       VARCHAR(40) NOT NULL,
  target_id         VARCHAR(64),
  details           JSONB,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);

COMMENT ON TABLE admin_audit_log IS 'Log of sensitive admin actions for compliance and debugging';
