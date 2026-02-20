# Architecture

Pulse is split into three runtime units:

1. Web (`apps/web`) for dashboard and controls.
2. API (`apps/api`) for persistence, scheduling, and API.
3. Worker (`apps/worker`) for queued post delivery.

The worker and API share the same database.
