-- targeted cleanup of dummy seed data
BEGIN;

DELETE FROM accumulator_tickets
WHERE id IN (
  SELECT DISTINCT accumulator_id
  FROM accumulator_picks
  WHERE match_description = 'Team A vs Team B'
);

COMMIT;
