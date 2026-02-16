-- Sync Status Tracking Table
-- Tracks automatic sync jobs and their status

CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) UNIQUE NOT NULL,
  last_sync_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'idle',
  last_error TEXT,
  last_sync_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_sync_status_updated_at ON sync_status;
CREATE TRIGGER update_sync_status_updated_at
  BEFORE UPDATE ON sync_status
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert initial sync status records
INSERT INTO sync_status (sync_type, status) VALUES
('fixtures', 'idle'),
('odds', 'idle'),
('live', 'idle'),
('finished', 'idle'),
('predictions', 'idle')
ON CONFLICT (sync_type) DO NOTHING;
