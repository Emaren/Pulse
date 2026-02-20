#!/usr/bin/env bash
set -euo pipefail

STAMP=$(date +%Y%m%d-%H%M%S)
DEST="${1:-/var/backups/pulse}"
mkdir -p "$DEST"
tar czf "$DEST/pulse-$STAMP.tgz" .
echo "Backup created: $DEST/pulse-$STAMP.tgz"
