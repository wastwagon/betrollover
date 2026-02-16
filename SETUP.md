# BetRollover v2 – Setup Guide

## Quick setup (macOS / Linux)

```bash
cd /Users/OceanCyber/Downloads/BetRolloverNew
chmod +x scripts/setup.sh
./scripts/setup.sh
```

## Quick setup (Windows)

```cmd
cd C:\path\to\BetRolloverNew
scripts\setup.bat
```

## Manual setup

### 1. Environment

```bash
cp .env.example .env
# Edit .env – add API_SPORTS_KEY (optional) for fixture sync
```

### 2. Dependencies

```bash
cd backend && npm install && npm run build && cd ..
cd web && npm install && cd ..
```

### 3. Start services

```bash
docker compose up -d --build
```

## URLs

| Service | URL |
|---------|-----|
| Web app | http://localhost:6002 |
| API | http://localhost:6001 |

## Admin login

- **Email:** admin@betrollover.com  
- **Password:** password  

## Useful commands

```bash
# View logs
docker compose logs -f

# Stop services
docker compose down

# Restart services
docker compose restart
```
