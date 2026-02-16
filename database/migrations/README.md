# Database Migrations

## Auto-run migrations (numeric prefix)

Files matching `^\d{3}_.*\.sql$` (e.g. `010_tipster_requests.sql`, `037_paystack_settings.sql`) run automatically on API startup. They are applied in sorted order and recorded in `applied_migrations`.

## Non-auto-run scripts

These files are **not** run automatically:

| File | Notes |
|------|-------|
| `convert_users_to_tipsters.sql` | PostgreSQL. One-off: converts users → tipsters, adds `minimum_roi` to api_settings. Run manually if needed. |
| `add_national_teams.sql` | **MySQL syntax** – incompatible with PostgreSQL. Do not run on this project. |
| `create_notifications_system.sql` | **MySQL syntax** – incompatible with PostgreSQL. Notifications table already created in init/03-core-tables.sql. Do not run. |

## Running migrations manually

```bash
# Docker
docker compose exec -T postgres psql -U betrollover -d betrollover -f - < database/migrations/018_enabled_leagues_category_api_type_bookmaker.sql

# Or via API container
docker exec -it <API_CONTAINER> bash /app/scripts/coolify-full-db-setup.sh
```

## Admin UI

Admin → Settings → Database migrations:
- **Run pending migrations** – apply any pending numeric migrations
- **Mark all as applied** – use when DB was migrated manually (e.g. first deploy)
