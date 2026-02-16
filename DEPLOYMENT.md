# BetRollover – Deployment & Login Best Practices

## Environment Variables for Production

Set these in your deployment (Vercel, Railway, Docker, etc.):

| Variable | Purpose | Example (Production) |
|----------|---------|------------------------|
| `APP_URL` | Canonical URL users access. **Required for correct login redirects.** | `https://app.yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | Same as APP_URL; used by web app | `https://app.yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | API URL the browser uses for fetch calls | `https://api.yourdomain.com` |
| `BACKEND_URL` | API URL the Next.js server uses (e.g. internal Docker network) | `http://api:3001` (Docker) or same as API |

## Login Redirect Fix

Login redirects use `APP_URL` / `NEXT_PUBLIC_APP_URL` as the base. This avoids:

- Redirecting to `localhost:3000` when the app runs on `localhost:6002`
- Wrong redirects behind reverse proxies
- "fetch failed" / "Backend unavailable" when the API is unreachable

**Local (Docker):** `APP_URL=http://localhost:6002`  
**Production:** `APP_URL=https://yourdomain.com`

## Correct URLs by Setup

| Setup | Web App | API |
|-------|---------|-----|
| Docker (`docker compose up`) | http://localhost:6002 | http://localhost:6001 |
| Local dev (npm run dev) | http://localhost:6002 (if `PORT=6002`) or 3000 | http://localhost:6001 |
| Production | https://yourdomain.com | https://api.yourdomain.com |

**Do not use `localhost:3000`** when running with Docker; the web container maps port 3000 to 6002 on the host.

## Backend CORS

The backend allows origins from `APP_URL` and `CORS_ORIGINS` (comma-separated). For production, set:

```
APP_URL=https://app.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com
```

## Checklist Before Go-Live

- [ ] `APP_URL` and `NEXT_PUBLIC_APP_URL` set to production URL
- [ ] `NEXT_PUBLIC_API_URL` set to production API URL
- [ ] `BACKEND_URL` set for server-side API calls (Docker: `http://api:3001`)
- [ ] `JWT_SECRET` is strong and unique (min 32 chars)
- [ ] CORS includes your production domain(s)
- [ ] HTTPS enabled for production
