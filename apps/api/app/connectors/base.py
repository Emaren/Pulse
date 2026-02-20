from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class Connector(ABC):
    @abstractmethod
    def post(self, account_token: str, payload: dict[str, Any]) -> str:
        raise NotImplementedError
