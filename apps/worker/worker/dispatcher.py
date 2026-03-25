from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .connectors.facebook import post_to_facebook
from .connectors.x import post_to_x
from .db import AuditEvent, PlatformAccount, PostDraft, PostQueue
from .retry import retry_delay_seconds


def _record_event(session: Session, event_type: str, queue_id: int, message: str, data: dict | None = None) -> None:
    session.add(
        AuditEvent(
            event_type=event_type,
            entity_type="post_queue",
            entity_id=str(queue_id),
            message=message,
            data_json=json.dumps(data or {}),
        )
    )


def _connector_for(platform: str):
    if platform == "x":
        return post_to_x
    if platform == "facebook":
        return post_to_facebook
    raise ValueError(f"Unsupported platform: {platform}")


def process_due_jobs(session: Session, batch_size: int, max_attempts: int) -> int:
    now = datetime.now(timezone.utc)
    rows = session.scalars(
        select(PostQueue)
        .where(PostQueue.status.in_(["queued", "retrying"]))
        .where(PostQueue.scheduled_at <= now)
        .order_by(PostQueue.scheduled_at.asc())
        .limit(batch_size)
    ).all()

    processed = 0

    for row in rows:
        processed += 1
        row.status = "sending"
        session.flush()

        try:
            payload = json.loads(row.payload_json or "{}")
            draft_id = payload.get("draft_id")
            draft = None
            if draft_id is not None:
                try:
                    draft = session.get(PostDraft, int(draft_id))
                except (TypeError, ValueError):
                    draft = None

            account = session.scalar(
                select(PlatformAccount)
                .where(PlatformAccount.platform == row.platform)
                .order_by(PlatformAccount.connected_at.desc(), PlatformAccount.id.desc())
            )
            if account is None:
                raise RuntimeError(f"No connected account for platform '{row.platform}'")

            if row.platform == "facebook":
                try:
                    details = json.loads(account.details_json or "{}")
                except Exception:  # noqa: BLE001
                    details = {}
                payload.setdefault("page_id", details.get("page_id"))

            connector = _connector_for(row.platform)
            external_post_id = connector(account.encrypted_access_token, payload)

            sent_at = datetime.now(timezone.utc)
            row.status = "sent"
            row.external_post_id = external_post_id
            row.posted_at = sent_at
            row.last_error = None
            row.attempts = row.attempts + 1
            if draft is not None:
                draft.status = "published"
                draft.published_at = sent_at
                draft.published_queue_id = row.id
            _record_event(session, "sent", row.id, f"Sent {row.platform} post", {"external_post_id": external_post_id})
        except Exception as exc:  # noqa: BLE001
            next_attempt = row.attempts + 1
            row.attempts = next_attempt
            row.last_error = str(exc)
            draft = None
            try:
                payload = json.loads(row.payload_json or "{}")
                draft_id = payload.get("draft_id")
                if draft_id is not None:
                    draft = session.get(PostDraft, int(draft_id))
            except Exception:  # noqa: BLE001
                draft = None

            if next_attempt < max_attempts:
                row.status = "retrying"
                row.scheduled_at = datetime.now(timezone.utc) + timedelta(seconds=retry_delay_seconds(next_attempt))
                _record_event(
                    session,
                    "retrying",
                    row.id,
                    "Dispatch failed; retry scheduled",
                    {"error": str(exc), "attempt": next_attempt},
                )
            else:
                row.status = "failed"
                if draft is not None:
                    draft.status = "needs_attention"
                _record_event(
                    session,
                    "failed",
                    row.id,
                    "Dispatch failed permanently",
                    {"error": str(exc), "attempt": next_attempt},
                )

        session.commit()

    return processed
