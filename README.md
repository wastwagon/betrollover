# BetRollover v2

Modern full-stack TypeScript rebuild of BetRollover — mobile-first web app + iOS/Android native apps.

**Reference:** Original implementation in `../BetRolloverApp` (PHP, MySQL, Bootstrap).

---

## Stack

| Layer | Technology |
|-------|------------|
| **API** | NestJS (Node.js + TypeScript) |
| **Web** | Next.js 14 (React, Tailwind) |
| **Mobile** | Expo / React Native |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis |
| **Local Dev** | Docker Compose |

---

## Quick Start

### Option A: One-command setup

```bash
chmod +x scripts/setup.sh && ./scripts/setup.sh
```

This installs dependencies, builds the backend, runs Docker (if available), and applies migrations.

### Option B: Manual (Docker)

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Node.js 20+ (for mobile dev outside Docker)

### 2. Database Setup

PostgreSQL is configured with init scripts in `database/init/`:
- `01-schema.sql` - Creates users table
- `02-seed-users.sql` - Seeds admin user (admin@betrollover.com / password)

**Default admin:** `admin@betrollover.com` / `password`

**Data migration from MySQL:** To migrate existing data from BetRollover v1, use the migration script in `database/migrations/` (to be added) or export/import manually.

**Wallet API:** `GET /wallet/balance` (requires JWT) — returns `{ balance, currency }`. Wallets are auto-created on registration.

**API-Sports Football:** Set `API_SPORTS_KEY` in `.env` (get from [api-football.com](https://www.api-football.com/)) to enable fixtures/leagues. Admin dashboard → Fixtures shows live data.

### 3. Environment

```bash
cp .env.example .env
# Edit .env with your Paystack keys if testing payments
```

### 4. Start All Services

```bash
docker compose up -d
```

**Note:** If you previously had MySQL in this project, run `docker compose down --remove-orphans` first to remove any orphan MySQL container.

PostgreSQL runs inside Docker; init scripts in `database/init/` run on first start. To run later migrations or connect from a GUI, see **[docs/DOCKER_AND_POSTGRES_SETUP.md](docs/DOCKER_AND_POSTGRES_SETUP.md)**.

### 5. Preview

| Service | URL |
|---------|-----|
| **Web** | http://localhost:6002 |
| **API** | http://localhost:6001 |
| **API Health** | http://localhost:6001/health |
| **API (versioned)** | http://localhost:6001/api/v1/* (e.g. `/api/v1/auth/login`) |

---

## Project Structure

```
BetRolloverNew/
├── docker-compose.yml    # PostgreSQL, Redis, API, Web
├── .env.example
├── backend/              # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/     # Login, register, JWT
│   │   │   ├── users/
│   │   │   └── health/
│   │   └── main.ts
│   └── Dockerfile
├── web/                  # Next.js (mobile-first)
│   ├── app/              # App Router pages
│   └── Dockerfile
└── mobile/              # Expo / React Native
    └── app/              # Expo Router screens
```

---

## Mobile App (Expo)

Run outside Docker (Expo needs native tooling):

```bash
cd mobile
npm install

# Add app assets (required by Expo)
# Option 1: Copy from Expo template
npx create-expo-app@latest _temp --template blank
cp _temp/assets/* assets/ && rm -rf _temp

# Option 2: Add your own icon.png (1024x1024), splash.png, adaptive-icon.png, favicon.png

# Start Expo
npx expo start
```

**API URL for mobile:** Use your machine's local IP (e.g. `192.168.1.x`) so the device/simulator can reach the API. The app uses `/api/v1` for all routes (no trailing slash on base URL):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:6001 npx expo start
```

---

## Coolify Deployment (VPS)

### Services to Deploy

1. **PostgreSQL** – Use Coolify's PostgreSQL service or external DB
2. **Redis** – Optional, for sessions/cache
3. **API** – NestJS container
4. **Web** – Next.js (build: `npm run build`, start: `npm run start`)

### Coolify Setup

1. Create a new project in Coolify
2. Add **PostgreSQL** database (or connect existing)
3. Add **Docker Compose** or **Dockerfile** for API:
   - Build: `./backend`
   - Port: 6001
4. Add **Dockerfile** for Web:
   - Build: `./web`
   - Build command: `npm run build`
   - Start: `npm run start`
   - Port: 6000
5. Set environment variables in Coolify (from `.env.example`)
6. Configure reverse proxy (Nginx) for your domain

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Add Paystack live keys
- [ ] Enable HTTPS
- [ ] Set `NEXT_PUBLIC_API_URL` to your API domain
- [ ] Configure CORS for your web domain

---

## Feature Reference (from v1)

Features to port from `../BetRolloverApp`:

- [x] Auth (login, register, JWT)
- [ ] Picks CRUD & marketplace
- [ ] Accumulator builder
- [ ] Wallet & Paystack
- [ ] Escrow for purchases
- [ ] Chat (WebSocket/Pusher)
- [ ] Notifications
- [ ] Leaderboard & contests
- [ ] Admin dashboard

---

## Development

### API (NestJS)

```bash
cd backend
npm install
npm run start:dev
```

### Web (Next.js)

```bash
cd web
npm install
npm run dev
```

### Run Tests

```bash
cd backend && npm test
```

---

## Docs

| Doc | Purpose |
|-----|---------|
| **[docs/SIMPLE_DEPLOY_GUIDE.md](docs/SIMPLE_DEPLOY_GUIDE.md)** | **Deploying with Coolify + GitHub (one branch, step-by-step)** |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching, conventional commits, PRs |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [docs/BACKUP_AND_RUNBOOK.md](docs/BACKUP_AND_RUNBOOK.md) | DB backup, migrations, release steps |
| [docs/TEMPLATE_IMPLEMENTATION_PHASES.md](docs/TEMPLATE_IMPLEMENTATION_PHASES.md) | World-class template alignment |
| [docs/WORLD_CLASS_DEV_TEMPLATE_COMPLETE.md](docs/WORLD_CLASS_DEV_TEMPLATE_COMPLETE.md) | Stack, phases, versioning reference |

---

## License

Proprietary — BetRollover
