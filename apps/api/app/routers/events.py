from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dates import ensure_utc
from ..deps import get_db
from ..models import AuditEvent
from ..schemas import AuditEventOut

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[AuditEventOut])
def list_events(limit: int = 200, db: Session = Depends(get_db)) -> list[AuditEventOut]:
    rows = db.scalars(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit)).all()
    return [
        AuditEventOut(
            id=row.id,
            event_type=row.event_type,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            message=row.message,
            data=json.loads(row.data_json or "{}"),
            created_at=ensure_utc(row.created_at),
        )
        for row in rows
    ]
