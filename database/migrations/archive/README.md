# archive/

Historical one-off scripts. **Do not run these.** They are kept for reference only.

| File | Status |
|------|--------|
| `convert_users_to_tipsters.sql` | Already applied on all live DBs. PostgreSQL-compatible. |
| `add_national_teams.sql` | MySQL syntax — will fail on PostgreSQL. |
| `create_notifications_system.sql` | MySQL syntax — will fail on PostgreSQL. Notifications are in init/03-core-tables.sql. |

The `MigrationRunnerService` only auto-runs files matching `^\d{3}_.*\.sql$` so nothing
in this folder is ever executed automatically.
