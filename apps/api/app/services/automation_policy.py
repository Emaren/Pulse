from __future__ import annotations

import json

from sqlalchemy.orm import Session

from ..models import AutomationPolicy


DEFAULT_QUIET_HOURS: list[str] = []


def get_or_create_policy(db: Session) -> AutomationPolicy:
    policy = db.get(AutomationPolicy, 1)
    if policy is None:
        policy = AutomationPolicy(
            id=1,
            cadence_enabled=False,
            cadence_interval_minutes=30,
            cadence_run_limit=6,
            quiet_hours_json=json.dumps(DEFAULT_QUIET_HOURS),
        )
        db.add(policy)
        db.flush()
    return policy
