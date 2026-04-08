-- Canonical machine outcome for settlement (e.g. home_draw, over25). prediction stays user-facing label.
ALTER TABLE accumulator_picks ADD COLUMN IF NOT EXISTS outcome_key VARCHAR(40) NULL;
