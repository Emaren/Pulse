from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .base import Connector


class XConnector(Connector):
    def post(self, account_token: str, payload: dict[str, Any]) -> str:
        _ = account_token
        _ = payload
        return f"x-{int(datetime.now(timezone.utc).timestamp())}"
