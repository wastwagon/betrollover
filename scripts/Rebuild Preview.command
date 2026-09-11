#!/bin/bash
# Double-click / open-in-Terminal wrapper around rebuild-docker-preview.sh
set -euo pipefail
cd "$(dirname "$0")/.."
bash ./scripts/rebuild-docker-preview.sh
echo ""
read -n 1 -s -r -p "Press any key to close…"
