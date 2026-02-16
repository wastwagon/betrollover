# BetRollover – VPS Deployment (Coolify)

Guide for deploying BetRollover on a VPS with [Coolify](https://coolify.io).

## Prerequisites

- VPS with Coolify installed (Ubuntu 22.04+ recommended)
- Domain(s) pointed to your VPS IP
- Git repository (GitHub, GitLab, or Gitea)

---

## 1. Coolify Setup

### Create New Resource

1. In Coolify dashboard: **+ Add Resource** → **Docker Compose**
2. Connect your Git repository (public or private)
3. **Base Directory:** leave empty (repo root)
4. **Docker Compose Location:** `docker-compose.prod.yml`
5. **Branch:** `main` (or your production branch)

---

## 2. Environment Variables

Set these in Coolify **before** the first deploy. Go to your resource → **Environment Variables**.

### Required

| Variable | Description | Example |
|----------|--------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `betrollover` |
| `POSTGRES_PASSWORD` | PostgreSQL password (strong!) | `your-secure-password` |
| `POSTGRES_DB` | Database name | `betrollover` |
| `JWT_SECRET` | JWT signing key (min 32 chars) | `your-random-32-char-secret` |
| `APP_URL` | Public app URL (no trailing slash) | `https://betrollover.com` |
| `NEXT_PUBLIC_APP_URL` | Same as APP_URL (for Next.js build) | `https://betrollover.com` |
| `NEXT_PUBLIC_API_URL` | Public API URL (no trailing slash) | `https://api.betrollover.com` |

### Optional (recommended for full features)

| Variable | Description |
|----------|-------------|
| `API_SPORTS_KEY` | [API-Football](https://www.api-football.com/) key for fixtures |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (or set in Admin Settings) |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `SENDGRID_API_KEY` | SendGrid for emails |
| `SMTP_FROM` | From email (e.g. `noreply@betrollover.com`) |
---

## 3. Domain Configuration

### Assign Domains in Coolify

1. **Web app:** Assign domain `betrollover.com` → service `web` (port 3000)
2. **API:** Assign domain `api.betrollover.com` → service `api` (port 3001)

Coolify uses Traefik; it will handle SSL (Let’s Encrypt) automatically when you add domains.

### DNS

Point your domains to the VPS IP:

```
betrollover.com      A    your-vps-ip
api.betrollover.com  A    your-vps-ip
```

---

## 4. Paystack Webhook (if using payments)

1. Paystack Dashboard → **Settings** → **Webhooks**
2. Add URL: `https://api.betrollover.com/wallet/paystack-webhook`
3. Select events: `charge.success` (and any others you need)

---

## 5. First Deploy

1. Save all environment variables in Coolify
2. Click **Deploy**
3. Coolify will build and start all services
4. Migrations run automatically on API startup
5. Seeds run automatically after migrations (news, resources, users, AI tipsters)
6. Visit `https://betrollover.com` when the build finishes

---

## 6. Post-Deploy

### Admin User

If you don’t have one yet, create an admin via database or seed:

```bash
# Connect to postgres (from Coolify or SSH)
docker exec -it betrollover-postgres psql -U betrollover -d betrollover -c "
  UPDATE users SET role = 'admin' WHERE email = 'your-admin@email.com';
"
```

### Paystack Keys

You can configure Paystack in **Admin → Settings → Paystack** instead of env vars.

---

## 7. Coolify – Database Not Loading

If the app shows "no data" or empty pages after deploy:

### 1. Find where Coolify stores your project

SSH into your VPS and run:

```bash
find /data -name "docker-compose.prod.yml" 2>/dev/null | head -5
# or
docker ps --format '{{.Names}}'
```

### 2. Run the diagnostic script

From the project root (or any directory):

```bash
cd /path/to/your/betrollover   # wherever Coolify cloned it
chmod +x scripts/coolify-db-diagnose.sh
./scripts/coolify-db-diagnose.sh
```

This shows: user count, migrations applied, admin user.

### 3. Manually run seeds (if diagnostic shows 0 users)

```bash
./scripts/coolify-run-seeds.sh
```

### 4. Check API logs in Coolify

Go to **Coolify → BetRollover → Logs** and look for:
- `Applied seed: news-resources-seed.sql` (success)
- `Seed failed (non-fatal):` (seeds errored)

### 5. Redeploy after code changes

If you pushed the psql-based seed fix, **redeploy** in Coolify so the new API image is used.

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| API won’t start | Check `JWT_SECRET` is set; view logs in Coolify |
| Web shows wrong API URL | `NEXT_PUBLIC_API_URL` must match your API domain; rebuild after changing |
| Paystack webhook fails | Ensure webhook URL is `https://api.betrollover.com/wallet/paystack-webhook` and publicly reachable |
| 502 Bad Gateway | Wait for health checks; API may need 40s+ to start and run migrations |
| Database connection failed | Ensure `POSTGRES_*` vars match; postgres must be healthy before API starts |

---

## 9. Manual Deploy (without Coolify)

If you prefer to deploy manually on a VPS:

```bash
git clone https://github.com/your-org/betrollover.git
cd betrollover

# Create .env from .env.example and fill values
cp .env.example .env
nano .env

# Deploy
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

Use a reverse proxy (Nginx/Caddy) in front for SSL and domain routing.

---

## 10. Hostinger VPS – Import Local Database

If you use Hostinger VPS (or any Linux server) with PostgreSQL and want to import your **local database** (migrated + seeded) onto the server:

### Step 1: Export on your local machine

```bash
./scripts/export-db-for-vps.sh
# Creates database/dump/betrollover-YYYYMMDD-HHMM.sql
```

### Step 2: Transfer dump to VPS

```bash
scp database/dump/betrollover-*.sql user@your-vps-ip:/path/to/project/database/dump/
```

### Step 3: Import on VPS

```bash
# SSH into VPS
ssh user@your-vps-ip

cd /path/to/project

# Create .env with POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
# (Hostinger: use the DB host/credentials from hPanel)

# Install psql if needed
sudo apt install postgresql-client

# Import from dump
chmod +x scripts/vps-import-db.sh
DUMP_FILE=database/dump/betrollover-20260216-123456.sql ./scripts/vps-import-db.sh
```

### Alternative: Fresh setup (no dump)

If you don’t have a local dump and want to run init + migrations + seeds from the project:

```bash
./scripts/vps-import-db.sh
```

This runs init scripts, all migrations, and seeds. Ensure the database exists and is empty (or drop/recreate it first).
