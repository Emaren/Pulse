from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from ..models import AuditEvent, Destination, PostDraft, PostQueue
from .moderation import ensure_post_allowed


def record_audit_event(
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


def queue_draft_for_destination(
    db: Session,
    draft: PostDraft,
    destination: Destination,
    scheduled_at: datetime,
    *,
    mode: str,
    source: str,
) -> tuple[PostDraft, PostQueue]:
    ensure_post_allowed(destination.platform, draft.body)

    queue_payload: dict[str, Any] = {
        "platform": destination.platform,
        "text": draft.body,
        "project_slug": draft.project.slug,
        "destination_id": destination.id,
        "draft_id": draft.id,
        "draft_title": draft.title,
    }
    if destination.platform == "facebook" and destination.external_ref:
        queue_payload["page_id"] = destination.external_ref

    queue_item = PostQueue(
        project_id=draft.project_id,
        platform=destination.platform,
        status="queued",
        scheduled_at=scheduled_at,
        payload_json=json.dumps(queue_payload),
        attempts=0,
    )
    db.add(queue_item)
    db.flush()

    draft.destination_id = destination.id
    draft.status = "queued"
    draft.queued_at = datetime.now(timezone.utc)
    draft.scheduled_for = scheduled_at
    draft.published_queue_id = queue_item.id

    record_audit_event(
        db,
        "draft_queued",
        "post_draft",
        str(draft.id),
        "Draft queued for delivery",
        {"queue_id": queue_item.id, "platform": destination.platform, "mode": mode, "source": source},
    )
    record_audit_event(
        db,
        "queued",
        "post_queue",
        str(queue_item.id),
        f"Queued draft for {destination.platform}",
        {"draft_id": draft.id, "source": source},
    )

    return draft, queue_item
