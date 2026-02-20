# Pulse

Pulse is a monorepo for an internal marketing automation system.

## Services
- `apps/web`: Next.js admin UI
- `apps/api`: FastAPI API + scheduler endpoints + account/token storage
- `apps/worker`: Queue processor that posts queued items
- `packages/shared`: Content registry, templates, and shared contracts
- `ops`: Nginx + systemd + deployment scripts
- `docs`: Architecture and runbooks

## Quick start
1. API: `cd apps/api && uv sync && uv run uvicorn app.main:app --reload --port 3390`
2. Worker: `cd apps/worker && uv sync && uv run python -m worker.main`
3. Web: `cd apps/web && pnpm install && pnpm dev --port 3090`
