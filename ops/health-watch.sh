#!/usr/bin/env bash
# Cron-friendly local health check: writes failures to stderr, returns nonzero.
set -euo pipefail
cd "$(dirname "$0")/.."
if ! docker compose ps --status running --services | grep -qx 'web'; then
  echo 'CRITICAL: SmartFuel web container is not running' >&2; exit 1
fi
if ! docker compose exec -T web python -c 'import urllib.request,json; data=json.load(urllib.request.urlopen("http://127.0.0.1:8000/api/health",timeout=6)); assert data["ok"]'; then
 echo 'CRITICAL: SmartFuel health probe failed' >&2; exit 1
fi
usage="$(df -P . | awk 'NR==2 {gsub(/%/,"",$5);print $5}')"
if [ "$usage" -ge 85 ]; then echo "WARNING: VPS disk usage ${usage}%" >&2; exit 1; fi
printf 'OK: SmartFuel online. Disk use %s%%\n' "$usage"
