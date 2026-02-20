from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.api_route("/health", methods=["GET", "HEAD"])
def health() -> dict:
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}
