# Architecture

Pulse is currently split into three runtime units:

1. Web (`apps/web`) for the operator dashboard, authoring flows, and approval controls.
2. API (`apps/api`) for persistence, project/destination metadata, draft orchestration, and queue scheduling.
3. Worker (`apps/worker`) for delivery of already-approved queue items.

The worker and API share the same database.

## Current builder direction

Pulse started as a queue-first social posting scaffold. The next builder phases are shifting it toward a library-first control tower with:

- project-aware publishing destinations
- persistent draft posts
- approval before execution
- cadence windows and scheduling policies
- eventual integration with richer campaign orchestration

The current implementation should be read as:

- Web: control tower shell, still early
- API: source of truth for project metadata, destinations, drafts, and queue items
- Worker: execution lane only, not campaign truth
