from fastapi import Header, HTTPException, status

from ..settings import settings


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    if settings.admin_api_key and x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")
