#!/usr/bin/env bash
set -euo pipefail

sudo systemctl restart pulse-web pulse-api pulse-worker
sudo systemctl status pulse-web pulse-api pulse-worker --no-pager
