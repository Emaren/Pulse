from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from ..dates import ensure_utc
from ..deps import get_db
from ..models import AuditEvent, PostQueue, Project
from ..schemas import QueueOut, QueueScheduleIn
from ..services.moderation import ModerationError, ensure_post_allowed
from ..services.post_builder import build_post_payloads
from ..services.scheduler import compute_scheduled_at

router = APIRouter(prefix="/queue", tags=["queue"])


def _record_event(
    db: Session,
    event_type: str,
    entity_id: str | None,
    message: str,
    data: dict[str, Any] | None = None,
) -> None:
    db.add(
        AuditEvent(
            event_type=event_type,
            entity_type="post_queue",
            entity_id=entity_id,
            message=message,
            data_json=json.dumps(data or {}),
        )
    )


def _to_out(item: PostQueue) -> QueueOut:
    return QueueOut(
        id=item.id,
        project_id=item.project_id,
        platform=item.platform,
        status=item.status,
        scheduled_at=ensure_utc(item.scheduled_at),
        attempts=item.attempts,
        last_error=item.last_error,
        external_post_id=item.external_post_id,
        posted_at=ensure_utc(item.posted_at),
        payload=json.loads(item.payload_json or "{}"),
    )


def _normalize_dt(dt: datetime | None) -> datetime | None:
    """Ensure scheduled_at is timezone-aware UTC (FastAPI may give naive)."""
    return ensure_utc(dt)


@router.get("", response_model=list[QueueOut])
def list_queue(limit: int = 100, db: Session = Depends(get_db)) -> list[QueueOut]:
    rows = db.scalars(select(PostQueue).order_by(PostQueue.scheduled_at.asc()).limit(limit)).all()
    return [_to_out(row) for row in rows]


@router.post("/schedule", response_model=list[QueueOut])
def schedule_posts(payload: QueueScheduleIn, db: Session = Depends(get_db)) -> list[QueueOut]:
    if not payload.updates:
        raise HTTPException(status_code=400, detail="At least one update is required")

    project = None
    if payload.project_slug:
        project = db.scalar(select(Project).where(and_(Project.slug == payload.project_slug, Project.active.is_(True))))
        if project is None:
            raise HTTPException(status_code=404, detail="Active project not found")

    drafts = build_post_payloads(project=project, updates=payload.updates, platforms=payload.platforms)

    base_time = _normalize_dt(payload.scheduled_at)

    created: list[PostQueue] = []
    for index, draft in enumerate(drafts):
        try:
            ensure_post_allowed(draft["platform"], draft["text"])
        except ModerationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        # Explicit scheduling semantics:
        # - exact: honor scheduled_at as-is (or default to now)
        # - next_slot: apply compute_scheduled_at() (cadence/jitter)
        if payload.mode == "exact":
            scheduled_at = base_time or datetime.now(timezone.utc)
        else:
            scheduled_at = compute_scheduled_at(
                index=index,
                base_time=base_time,
                default_delay_minutes=5,
                jitter_minutes=20,
            )

        row = PostQueue(
            project_id=project.id if project else None,
            platform=draft["platform"],
            status="queued",
            scheduled_at=scheduled_at,
            payload_json=json.dumps(draft),
            attempts=0,
        )
        db.add(row)
        created.append(row)

    db.flush()
    for row in created:
        _record_event(
            db,
            "queued",
            str(row.id),
            f"Queued post for {row.platform}",
            {"mode": payload.mode},
        )

    db.commit()

    for row in created:
        db.refresh(row)

    return [_to_out(row) for row in created]


@router.post("/{queue_id}/retry", response_model=QueueOut)
def retry_queue_item(queue_id: int, db: Session = Depends(get_db)) -> QueueOut:
    row = db.get(PostQueue, queue_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Queue item not found")

    row.status = "queued"
    row.last_error = None
    row.scheduled_at = datetime.now(timezone.utc)

    _record_event(db, "retried", str(row.id), "Queue item retried")
    db.commit()
    db.refresh(row)

    return _to_out(row)
