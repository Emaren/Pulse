from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dates import ensure_utc
from ..deps import get_db
from ..models import AuditEvent, Destination, PostDraft, PostQueue, Project, Template
from ..schemas import ContextDraftIn, DraftIn, DraftOut, DraftQueueIn, DraftStatusUpdateIn
from ..services.context_drafts import create_context_draft as create_context_draft_record
from ..services.draft_queue import queue_draft_for_destination
from ..services.moderation import ModerationError, ensure_post_allowed
from ..services.scheduler import compute_scheduled_at
from ..settings import settings

router = APIRouter(prefix="/drafts", tags=["drafts"])


def _record_event(
    db: Session,
    event_type: str,
    entity_type: str,
    entity_id: str | None,
    message: str,
    data: dict[str, Any] | None = None,
) -> None:
    db.add(
        AuditEvent(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            message=message,
            data_json=json.dumps(data or {}),
        )
    )


def _normalize_dt(dt: datetime | None) -> datetime | None:
    return ensure_utc(dt)


def _to_out(item: PostDraft) -> DraftOut:
    return DraftOut(
        id=item.id,
        project_id=item.project_id,
        project_slug=item.project.slug,
        destination_id=item.destination_id,
        destination_name=item.destination.name if item.destination else None,
        platform=item.destination.platform if item.destination else None,
        title=item.title,
        body=item.body,
        source_type=item.source_type,
        kind=item.kind,
        status=item.status,
        priority=item.priority,
        source_ref=item.source_ref,
        notes=json.loads(item.notes_json or "{}"),
        approved_at=ensure_utc(item.approved_at),
        queued_at=ensure_utc(item.queued_at),
        published_at=ensure_utc(item.published_at),
        scheduled_for=ensure_utc(item.scheduled_for),
        published_queue_id=item.published_queue_id,
        created_at=ensure_utc(item.created_at),
        updated_at=ensure_utc(item.updated_at),
    )
def _resolve_destination(db: Session, draft: PostDraft, destination_id: int | None) -> Destination:
    resolved_id = destination_id or draft.destination_id
    if resolved_id is None:
        raise HTTPException(status_code=400, detail="Draft requires a destination before it can be queued")

    destination = db.get(Destination, resolved_id)
    if destination is None or not destination.active:
        raise HTTPException(status_code=404, detail="Active destination not found")
    if destination.project_id != draft.project_id:
        raise HTTPException(status_code=400, detail="Destination does not belong to the same project as the draft")
    return destination


@router.get("", response_model=list[DraftOut])
def list_drafts(status: str | None = None, limit: int = 200, db: Session = Depends(get_db)) -> list[DraftOut]:
    stmt = select(PostDraft).order_by(PostDraft.updated_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(PostDraft.status == status)
    rows = db.scalars(stmt).all()
    return [_to_out(row) for row in rows]


@router.post("/context", response_model=DraftOut)
def create_context_draft(payload: ContextDraftIn, db: Session = Depends(get_db)) -> DraftOut:
    draft = create_context_draft_record(db, payload)
    db.commit()
    db.refresh(draft)
    return _to_out(draft)


@router.post("", response_model=DraftOut)
def create_draft(payload: DraftIn, db: Session = Depends(get_db)) -> DraftOut:
    project = db.scalar(select(Project).where(Project.slug == payload.project_slug))
    if project is None:
        raise HTTPException(status_code=404, detail=f"Project not found: {payload.project_slug}")

    destination = None
    if payload.destination_id is not None:
        destination = db.get(Destination, payload.destination_id)
        if destination is None or destination.project_id != project.id:
            raise HTTPException(status_code=400, detail="Destination does not belong to the selected project")

    draft = PostDraft(
        project_id=project.id,
        destination_id=destination.id if destination else None,
        title=payload.title.strip(),
        body=payload.body.strip(),
        source_type=payload.source_type,
        kind=payload.kind,
        status="draft",
        priority=payload.priority,
        source_ref=payload.source_ref,
        notes_json=json.dumps(payload.notes),
        scheduled_for=_normalize_dt(payload.scheduled_for),
    )
    db.add(draft)
    db.flush()

    _record_event(
        db,
        "draft_created",
        "post_draft",
        str(draft.id),
        "Draft created",
        {"project_slug": payload.project_slug, "kind": payload.kind, "source_type": payload.source_type},
    )

    db.commit()
    db.refresh(draft)
    return _to_out(draft)


@router.post("/{draft_id}/approve", response_model=DraftOut)
def approve_draft(draft_id: int, db: Session = Depends(get_db)) -> DraftOut:
    draft = db.get(PostDraft, draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status in {"archived", "published"}:
        raise HTTPException(status_code=400, detail=f"Cannot approve a {draft.status} draft")

    draft.status = "approved"
    draft.approved_at = datetime.now(timezone.utc)

    _record_event(db, "draft_approved", "post_draft", str(draft.id), "Draft approved")
    db.commit()
    db.refresh(draft)
    return _to_out(draft)


@router.post("/{draft_id}/status", response_model=DraftOut)
def update_draft_status(draft_id: int, payload: DraftStatusUpdateIn, db: Session = Depends(get_db)) -> DraftOut:
    draft = db.get(PostDraft, draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    if draft.status in {"queued", "published"} and draft.status != payload.status:
        raise HTTPException(status_code=400, detail=f"Cannot move a {draft.status} draft into a manual review lane")

    if draft.status == payload.status:
        return _to_out(draft)

    previous_status = draft.status
    draft.status = payload.status
    if payload.status == "draft":
        draft.approved_at = None
        draft.queued_at = None
        draft.scheduled_for = None
        draft.published_queue_id = None

    _record_event(
        db,
        "draft_status_updated",
        "post_draft",
        str(draft.id),
        f"Draft moved from {previous_status} to {payload.status}",
        {"from": previous_status, "to": payload.status},
    )
    db.commit()
    db.refresh(draft)
    return _to_out(draft)


@router.post("/{draft_id}/queue", response_model=DraftOut)
def queue_draft(draft_id: int, payload: DraftQueueIn, db: Session = Depends(get_db)) -> DraftOut:
    draft = db.get(PostDraft, draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status in {"archived", "published", "rejected"}:
        raise HTTPException(status_code=400, detail=f"Cannot queue a {draft.status} draft")

    destination = _resolve_destination(db, draft, payload.destination_id)
    if destination.requires_approval and draft.approved_at is None:
        raise HTTPException(status_code=400, detail="Destination requires approval before queueing")

    try:
        ensure_post_allowed(destination.platform, draft.body)
    except ModerationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    base_time = _normalize_dt(payload.scheduled_at or draft.scheduled_for)
    if payload.mode == "next_slot":
        scheduled_at = compute_scheduled_at(
            index=0,
            base_time=base_time,
            default_delay_minutes=settings.queue_default_delay_minutes,
            jitter_minutes=0,
            windows=json.loads(destination.windows_json or "[]"),
            timezone_name=destination.timezone,
        )
    else:
        scheduled_at = base_time or datetime.now(timezone.utc)

    queue_draft_for_destination(
        db,
        draft,
        destination,
        scheduled_at,
        mode=payload.mode,
        source="manual",
    )

    db.commit()
    db.refresh(draft)
    return _to_out(draft)
