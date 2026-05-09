-- Track unique logged-in users who copy a pick's booking code (one row per user per pick)
CREATE TABLE IF NOT EXISTS accumulator_booking_code_copies (
  id SERIAL PRIMARY KEY,
  accumulator_id INT NOT NULL REFERENCES accumulator_tickets(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(accumulator_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_abcc_accumulator_id ON accumulator_booking_code_copies(accumulator_id);
