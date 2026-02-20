from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone


def compute_scheduled_at(
    index: int,
    base_time: datetime | None,
    default_delay_minutes: int,
    jitter_minutes: int,
) -> datetime:
    start = base_time or (datetime.now(timezone.utc) + timedelta(minutes=default_delay_minutes))
    spacing = timedelta(minutes=index * 10)
    jitter = timedelta(minutes=random.randint(0, jitter_minutes))
    return start + spacing + jitter
