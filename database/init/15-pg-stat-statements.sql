-- pg_stat_statements (query stats). Requires postgres to load the library at startup — see docker-compose `command:` on the postgres service.
-- On existing databases (volume already initialized), run once: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
