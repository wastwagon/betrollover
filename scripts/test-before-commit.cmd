@echo off
REM Run builds and tests before committing. Double-click or run from project root:
REM   scripts\test-before-commit.cmd

cd /d "%~dp0\.."

echo === 1. shared-types build ===
cd packages\shared-types
call npm run build
if errorlevel 1 exit /b 1
cd ..\..

echo.
echo === 2. Backend build ===
cd backend
call npm run build
if errorlevel 1 exit /b 1
cd ..

echo.
echo === 3. Backend tests ===
cd backend
call npm test -- --passWithNoTests
if errorlevel 1 exit /b 1
cd ..

echo.
echo === 4. Web build ===
cd web
call npm run build
if errorlevel 1 exit /b 1
cd ..

echo.
echo All checks passed. Safe to commit.
