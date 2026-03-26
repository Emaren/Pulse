from __future__ import annotations

import random
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo


def _parse_window(value: str) -> tuple[int, int] | None:
    try:
        hour_text, minute_text = value.split(":", 1)
        hour = int(hour_text)
        minute = int(minute_text)
    except ValueError:
        return None

    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        return None
    return hour, minute


def compute_scheduled_at(
    index: int,
    base_time: datetime | None,
    default_delay_minutes: int,
    jitter_minutes: int,
    windows: list[str] | None = None,
    timezone_name: str = "UTC",
) -> datetime:
    start = base_time or (datetime.now(timezone.utc) + timedelta(minutes=default_delay_minutes))

    parsed_windows = [_parse_window(item) for item in windows or []]
    clean_windows = [item for item in parsed_windows if item is not None]
    if clean_windows:
        try:
            zone = ZoneInfo(timezone_name)
        except Exception:
            zone = timezone.utc

        local_start = start.astimezone(zone)
        candidates: list[datetime] = []
        day_offset = 0
        sorted_windows = sorted(clean_windows)

        while len(candidates) <= index:
            day = (local_start + timedelta(days=day_offset)).date()
            for hour, minute in sorted_windows:
                candidate = datetime.combine(day, time(hour=hour, minute=minute), tzinfo=zone)
                if candidate >= local_start:
                    candidates.append(candidate)
            day_offset += 1
            if day_offset > 14:
                break

        if candidates:
            return candidates[min(index, len(candidates) - 1)].astimezone(timezone.utc)

    spacing = timedelta(minutes=index * 10)
    jitter = timedelta(minutes=random.randint(0, jitter_minutes))
    return start + spacing + jitter
