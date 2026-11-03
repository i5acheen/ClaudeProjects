#!/usr/bin/env bash
# Update a running install: back up, pull the latest code, rebuild the app, apply new migrations.
#   sudo bash /opt/healthconnectcrm/HealthConnectCRM/deploy/update.sh
set -euo pipefail
APP=$(cd "$(dirname "$0")/.." && pwd)
cd "$APP/deploy/supabase"
echo "==> Backup before updating"
docker compose exec -T backup backup.sh --once
echo "==> Pulling code"
git -C "$APP/.." pull -q --ff-only
TAG=$(date +%Y%m%d%H%M)
docker image inspect healthconnectcrm-app:latest >/dev/null 2>&1 && docker tag healthconnectcrm-app:latest "healthconnectcrm-app:$TAG-before-update"
echo "==> Rebuilding the app (previous image kept as healthconnectcrm-app:$TAG-before-update for rollback)"
sh "$APP/deploy/setup.sh" >/dev/null
docker compose up -d --build app backup
sh "$APP/deploy/migrate.sh"
. "$APP/deploy/site.env"
curl -fsS --max-time 20 "$SITE_SCHEME://$APP_HOST/api/health" && echo && echo "==> Update complete"
