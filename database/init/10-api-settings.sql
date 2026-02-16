-- API Settings table for storing API-Sports Football configuration
CREATE TABLE IF NOT EXISTS api_settings (
  id SERIAL PRIMARY KEY,
  api_sports_key VARCHAR(255),
  daily_requests_used INT NOT NULL DEFAULT 0,
  daily_requests_limit INT NOT NULL DEFAULT 0,
  last_request_date TIMESTAMP,
  last_test_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT false,
  minimum_roi DECIMAL(5,2) DEFAULT 20.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_api_settings_updated_at ON api_settings;
CREATE TRIGGER update_api_settings_updated_at
  BEFORE UPDATE ON api_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default record if it doesn't exist (using id = 1)
INSERT INTO api_settings (id, api_sports_key, is_active, minimum_roi)
SELECT 1, NULL, false, 20.0
WHERE NOT EXISTS (SELECT 1 FROM api_settings WHERE id = 1);
