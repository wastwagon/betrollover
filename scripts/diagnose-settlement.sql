-- BetRollover Settlement Diagnostic - run with:
--   docker compose exec -T postgres psql -U betrollover -d betrollover -f scripts/diagnose-settlement.sql
-- Or: psql -U betrollover -d betrollover -f scripts/diagnose-settlement.sql

\echo '=== 1. ACCUMULATOR_PICKS OVERVIEW ==='
SELECT 
  COUNT(*) AS total_picks,
  COUNT(fixture_id) AS with_fixture_id,
  COUNT(*) - COUNT(fixture_id) AS without_fixture_id,
  COUNT(*) FILTER (WHERE result = 'pending') AS pending_total,
  COUNT(*) FILTER (WHERE result = 'pending' AND fixture_id IS NOT NULL) AS pending_with_fixture
FROM accumulator_picks;

\echo ''
\echo '=== 2. FINISHED FIXTURES vs PENDING PICKS ==='
SELECT 
  (SELECT COUNT(*) FROM fixtures WHERE status = 'FT' AND home_score IS NOT NULL) AS ft_fixtures,
  (SELECT COUNT(*) FROM accumulator_picks WHERE result = 'pending' AND fixture_id IS NOT NULL) AS pending_with_fix,
  (SELECT COUNT(*) 
   FROM accumulator_picks ap 
   JOIN fixtures f ON f.id = ap.fixture_id 
   WHERE ap.result = 'pending' 
   AND f.status = 'FT' 
   AND f.home_score IS NOT NULL 
   AND f.away_score IS NOT NULL
  ) AS pending_linked_to_ft;

\echo ''
\echo '=== 3. SAMPLE: PENDING PICKS WITHOUT FIXTURE_ID (first 5) ==='
SELECT ap.id, at.title, ap.match_description, ap.prediction, ap.result
FROM accumulator_picks ap
JOIN accumulator_tickets at ON at.id = ap.accumulator_id
WHERE ap.result = 'pending' AND ap.fixture_id IS NULL
LIMIT 5;

\echo ''
\echo '=== 4. SAMPLE: PENDING PICKS WITH FIXTURE_ID ==='
SELECT ap.id, at.title, f.home_team_name, f.away_team_name, f.status, ap.result
FROM accumulator_picks ap
JOIN accumulator_tickets at ON at.id = ap.accumulator_id
LEFT JOIN fixtures f ON f.id = ap.fixture_id
WHERE ap.result = 'pending' AND ap.fixture_id IS NOT NULL
LIMIT 5;
