-- One-time fix: set result/status on tickets that have all picks settled but are still pending.
-- Run after deploying settlement fixes so those tickets move to Archive.
-- Safe: only updates accumulator_tickets where every pick is already won/lost/void.
--
-- Usage:
--   psql -U betrollover -d betrollover -f scripts/fix-already-settled-tickets.sql
--   docker compose exec -T postgres psql -U betrollover -d betrollover -f scripts/fix-already-settled-tickets.sql

\echo '=== Fixing tickets with all picks settled but result still pending ==='

WITH settled_tickets AS (
  SELECT t.id,
    CASE
      WHEN EXISTS (SELECT 1 FROM accumulator_picks p WHERE p.accumulator_id = t.id AND p.result = 'lost') THEN 'lost'
      WHEN EXISTS (SELECT 1 FROM accumulator_picks p WHERE p.accumulator_id = t.id AND p.result = 'void') THEN 'void'
      ELSE 'won'
    END AS new_result
  FROM accumulator_tickets t
  WHERE t.result = 'pending'
  AND NOT EXISTS (SELECT 1 FROM accumulator_picks p WHERE p.accumulator_id = t.id AND p.result = 'pending')
)
UPDATE accumulator_tickets at
SET result = st.new_result, status = st.new_result
FROM settled_tickets st
WHERE at.id = st.id;

\echo 'Done. Re-run settlement diagnostic to confirm pending counts.'
