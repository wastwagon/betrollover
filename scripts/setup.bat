@echo off
REM BetRollover v2 - Full Setup (Windows)
REM Run from project root: scripts\setup.bat

cd /d "%~dp0\.."

echo === BetRollover v2 Setup ===

REM 1. Ensure .env exists
if not exist .env (
  echo [1/5] Creating .env from .env.example...
  copy .env.example .env
  echo       Edit .env to add API_SPORTS_KEY and other secrets.
) else (
  echo [1/5] .env already exists.
)

REM 2. Install backend dependencies
echo [2/5] Installing backend dependencies...
cd backend
call npm install
cd ..

REM 3. Install web dependencies
echo [3/5] Installing web dependencies...
cd web
call npm install
cd ..

REM 4. Build backend
echo [4/5] Building backend...
cd backend
call npm run build
cd ..

REM 5. Start Docker services
echo [5/5] Starting Docker services...
docker compose up -d --build

echo.
echo === Setup complete ===
echo.
echo Services:
echo   Web:    http://localhost:6002
echo   API:    http://localhost:6001
echo.
echo Admin login: admin@betrollover.com / password
echo.
echo To view logs: docker compose logs -f
echo To stop:      docker compose down
echo.
pause
