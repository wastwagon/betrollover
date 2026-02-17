# BetRollover – Coolify Setup Checklist

Step-by-step setup in the Coolify UI.

---

## 1. Create resource

1. In Coolify: **+ Add** (or **Add Resource**).
2. Choose **Docker Compose**.
3. **Name:** e.g. `BetRollover`.

---

## 2. Connect Git

1. **Source:** GitHub / GitLab / Gitea (connect if needed).
2. **Repository:** Select `wastwagon/betrollover` (or your fork).
3. **Branch:** `main`.
4. **Docker Compose Location:** `docker-compose.prod.yml`
5. **Base Directory:** leave empty.
6. Save / Continue.

---

## 3. Environment variables

Go to the resource → **Environment Variables**. Add these **before** the first deploy.

### Required (copy & fill)

| Variable | Value | Notes |
|----------|--------|--------|
| `POSTGRES_USER` | `betrollover` | DB user |
| `POSTGRES_PASSWORD` | *strong password* | DB password |
| `POSTGRES_DB` | `betrollover` | DB name |
| `JWT_SECRET` | *random 32+ chars* | e.g. `openssl rand -base64 32` |
| `APP_URL` | `https://betrollover.com` | Your app URL (no trailing slash) |
| `NEXT_PUBLIC_APP_URL` | `https://betrollover.com` | Same as APP_URL |
| `NEXT_PUBLIC_API_URL` | `https://api.betrollover.com` | Your API URL (no trailing slash) |

### Optional (for full features)

| Variable | Description |
|----------|-------------|
| `API_SPORTS_KEY` | [API-Football](https://www.api-football.com/) key for fixtures/odds |
| `PAYSTACK_SECRET_KEY` | Paystack secret (live) |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key (live) |
| `SENDGRID_API_KEY` | SendGrid API key for emails |
| `SMTP_FROM` | e.g. `noreply@betrollover.com` |

You do **not** need to set `BACKEND_URL` — it is set in `docker-compose.prod.yml` for the web service.

---

## 4. Domains

In the resource, assign domains to the services:

| Service | Domain | Port |
|---------|--------|------|
| **web** | `betrollover.com` (and `www.betrollover.com` if you use it) | 3000 |
| **api** | `api.betrollover.com` | 3001 |

Coolify/Traefik will request Let’s Encrypt SSL for these domains.

### DNS (on your domain provider)

Point the domains to your VPS IP:

- `betrollover.com` → **A** → your VPS IP  
- `www.betrollover.com` → **A** → your VPS IP (optional)  
- `api.betrollover.com` → **A** → your VPS IP  

---

## 5. Deploy

1. Save all environment variables.
2. Click **Deploy** (or **Redeploy**).
3. Wait for the build (API and Web images). First deploy can take several minutes.
4. Postgres and Redis start first; API starts after they are healthy; Web starts after API.

When the deployment shows **Finished**, open **https://betrollover.com**.

---

## 6. After first deploy

- **Admin user:** If no admin exists, set one via DB:
  ```bash
  docker exec -it betrollover-postgres psql -U betrollover -d betrollover -c \
    "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
  ```
- **Paystack webhook:** In Paystack dashboard set webhook URL to  
  `https://api.betrollover.com/wallet/paystack-webhook`

---

## Quick reference

| Item | Value |
|------|--------|
| Compose file | `docker-compose.prod.yml` |
| Branch | `main` |
| Web URL | https://betrollover.com |
| API URL | https://api.betrollover.com |
| BACKEND_URL | Set in compose (no need in Coolify) |

For more detail (troubleshooting, manual deploy, DB import): see **DEPLOYMENT.md**.
