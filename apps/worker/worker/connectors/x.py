from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def post_to_x(token: str, payload: dict[str, Any]) -> str:
    _ = token
    _ = payload
    return f"x-{int(datetime.now(timezone.utc).timestamp())}"
