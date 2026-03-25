#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/var/www/Pulse}"

cd "$ROOT"

echo "[1/7] Pull latest code"
git pull --ff-only

echo "[2/7] Sync API dependencies"
cd "$ROOT/apps/api"
uv sync

echo "[3/7] Sync worker dependencies"
cd "$ROOT/apps/worker"
uv sync

echo "[4/7] Install web dependencies"
cd "$ROOT/apps/web"
pnpm install --frozen-lockfile

echo "[5/7] Build web"
pnpm build

echo "[6/7] Restart Pulse services"
sudo systemctl restart pulse-api pulse-worker pulse-web

echo "[7/7] Validate and reload nginx"
sudo nginx -t
sudo systemctl reload nginx

echo
echo "Pulse deployment complete. Service summary:"
sudo systemctl --no-pager --full --lines=0 status pulse-api pulse-worker pulse-web
