.PHONY: api-dev worker-dev web-dev tree

api-dev:
	cd apps/api && uv run uvicorn app.main:app --reload --port 3390

worker-dev:
	cd apps/worker && uv run python -m worker.main

web-dev:
	cd apps/web && pnpm dev --port 3090

tree:
	tree -L 4 .
