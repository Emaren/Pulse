from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth.tokens_crypto import encrypt_token
from ..deps import get_db
from ..models import PlatformAccount
from ..schemas import AccountConnectIn, AccountOut

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)) -> list[AccountOut]:
    rows = db.scalars(select(PlatformAccount).order_by(PlatformAccount.id.asc())).all()
    return [
        AccountOut(
            id=row.id,
            platform=row.platform,
            account_name=row.account_name,
            connected_at=row.connected_at,
        )
        for row in rows
    ]


@router.post("/connect/{platform}", response_model=AccountOut)
def connect_account(
    payload: AccountConnectIn,
    platform: str = Path(pattern="^(x|facebook)$"),
    db: Session = Depends(get_db),
) -> AccountOut:
    if platform not in {"x", "facebook"}:
        raise HTTPException(status_code=400, detail="Unsupported platform")

    account = PlatformAccount(
        platform=platform,
        account_name=payload.account_name,
        encrypted_access_token=encrypt_token(payload.access_token),
        encrypted_refresh_token=encrypt_token(payload.refresh_token or "") or None,
        details_json=json.dumps(payload.details),
        connected_at=datetime.now(timezone.utc),
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    return AccountOut(
        id=account.id,
        platform=account.platform,
        account_name=account.account_name,
        connected_at=account.connected_at,
    )


@router.get("/connect/{platform}")
def start_connect_flow(platform: str = Path(pattern="^(x|facebook)$")) -> dict[str, str]:
    if platform == "x":
        return {"platform": "x", "next_step": "Redirect user to X OAuth authorize URL"}
    if platform == "facebook":
        return {"platform": "facebook", "next_step": "Redirect user to Facebook OAuth authorize URL"}
    raise HTTPException(status_code=400, detail="Unsupported platform")
