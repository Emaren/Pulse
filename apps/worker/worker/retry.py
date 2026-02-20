from __future__ import annotations


def retry_delay_seconds(attempt_number: int) -> int:
    # Basic backoff: 60s, 120s, 240s...
    return 60 * (2 ** max(attempt_number - 1, 0))
