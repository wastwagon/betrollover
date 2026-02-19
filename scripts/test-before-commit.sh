#!/usr/bin/env bash
# Run builds and tests before committing. Use from project root:
#   bash scripts/test-before-commit.sh
# Or on Windows (Git Bash or WSL): bash scripts/test-before-commit.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1. shared-types build ==="
cd packages/shared-types && npm run build && cd "$ROOT"

echo ""
echo "=== 2. Backend build ==="
cd backend && npm run build && cd "$ROOT"

echo ""
echo "=== 3. Backend tests ==="
cd backend && npm test -- --passWithNoTests && cd "$ROOT"

echo ""
echo "=== 4. Web build ==="
cd web && npm run build && cd "$ROOT"

echo ""
echo "All checks passed. Safe to commit."
