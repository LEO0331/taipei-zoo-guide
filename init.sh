#!/usr/bin/env bash
set -euo pipefail

echo "=== Harness Initialization ==="

echo "=== npm ci ==="
npm ci

echo "=== npm run convert:data ==="
npm run convert:data

echo "=== npm test ==="
npm test

echo "=== npm run build ==="
npm run build

echo "=== GITHUB_PAGES=true npm run build ==="
GITHUB_PAGES=true npm run build

echo "=== npm audit --audit-level=moderate ==="
npm audit --audit-level=moderate

echo "=== Verification Complete ==="
echo ""
echo "Optional live data refresh:"
echo "  npm run fetch:data"
echo "  RESOURCE_URL=<official-csv-url> npm run data:fetch:exhibit-areas"
echo "  RESOURCE_URL=<official-csv-url> npm run data:fetch:events"
echo "  RESOURCE_URL=<official-csv-url> npm run data:fetch:plants"
echo "  npm run convert:data"
echo ""
echo "Next steps:"
echo "1. Read feature_list.json for current feature state"
echo "2. Pick ONE unfinished feature"
echo "3. Implement only that feature"
echo "4. Re-run ./init.sh before claiming done"
