-- Acca Generator: allow 200-leg analysis slips.
-- NUMERIC(12,3) overflowed on long Sure-band accas (e.g. 1.30^100 ≈ 1.9e11)
-- and caused HTTP 500 on /acca-generator/generate. Unbounded numeric stores the product.

ALTER TABLE acca_generator_runs
  ALTER COLUMN combined_odds TYPE NUMERIC;

ALTER TABLE accumulator_tickets
  ALTER COLUMN total_odds TYPE NUMERIC;

COMMENT ON COLUMN acca_generator_runs.combined_odds IS
  'Product of leg odds; unbounded so long analysis slips (up to 200 legs) can persist.';

COMMENT ON COLUMN api_settings.acca_generator_max_legs IS
  'Maximum fixtures/legs a user may request (1–200).';

UPDATE api_settings
SET acca_generator_max_legs = 200
WHERE id = 1
  AND acca_generator_max_legs < 200;
