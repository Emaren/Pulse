from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import httpx

from .settings import settings

logger = logging.getLogger("pulse-worker")


def maybe_run_cadence_automation() -> dict | None:
    try:
        with httpx.Client(base_url=settings.pulse_api_base_url, timeout=settings.automation_request_timeout_seconds) as client:
            settings_response = client.get("/automation/settings")
            settings_response.raise_for_status()
            policy = settings_response.json()

            if not policy.get("cadence_enabled"):
                return None

            last_run_at = policy.get("last_cadence_run_at")
            if last_run_at:
                try:
                    last_run = datetime.fromisoformat(last_run_at.replace("Z", "+00:00"))
                    if last_run.tzinfo is None:
                        last_run = last_run.replace(tzinfo=timezone.utc)
                    next_allowed = last_run + timedelta(minutes=int(policy.get("cadence_interval_minutes", 30)))
                    if next_allowed > datetime.now(timezone.utc):
                        return None
                except Exception:  # noqa: BLE001
                    logger.warning("Could not parse cadence last-run timestamp: %s", last_run_at)

            run_response = client.post("/automation/cadence/run", json={})
            run_response.raise_for_status()
            return run_response.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cadence automation check failed: %s", exc)
        return None
