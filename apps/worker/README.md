# Pulse Worker

Queue worker that pulls due jobs from `post_queue`, posts through connector stubs, and writes `audit_events`.

## Run
```bash
uv sync
uv run python -m worker.main
```
