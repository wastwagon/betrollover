-- Optional bookmaker + booking (share) code for tipster slips (African bookies list enforced in app)
ALTER TABLE accumulator_tickets
  ADD COLUMN IF NOT EXISTS bookmaker_key VARCHAR(64) NULL;

ALTER TABLE accumulator_tickets
  ADD COLUMN IF NOT EXISTS booking_code VARCHAR(128) NULL;
