from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models import Destination, PostDraft, PostQueue, Project
from .scheduler import compute_scheduled_at


COOLDOWN_BY_MODE = {
    "quiet": 480,
    "gentle": 300,
    "normal": 180,
    "aggressive": 120,
    "launch": 90,
}

REPEAT_LOOKBACK_DAYS = 7


@dataclass
class CadencePreview:
    destination: Destination
    project: Project
    queued_today: int
    cooldown_minutes: int
    cooldown_until: datetime | None
    next_window_at: datetime | None
    eligible_drafts: list[PostDraft]
    blocked_reason: str | None


def _zone_for_destination(destination: Destination) -> ZoneInfo:
    try:
        return ZoneInfo(destination.timezone)
    except Exception:
        return ZoneInfo("UTC")


def _local_day_bounds(now: datetime, destination: Destination) -> tuple[datetime, datetime]:
    zone = _zone_for_destination(destination)
    local_now = now.astimezone(zone)
    day_start_local = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end_local = day_start_local + timedelta(days=1)
    return day_start_local.astimezone(timezone.utc), day_end_local.astimezone(timezone.utc)


def _history_for_destination(db: Session, destination: Destination, *, now: datetime) -> list[tuple[PostQueue, dict]]:
    lookback = now - timedelta(days=REPEAT_LOOKBACK_DAYS)
    rows = db.scalars(
        select(PostQueue)
        .where(
            PostQueue.project_id == destination.project_id,
            PostQueue.platform == destination.platform,
            PostQueue.scheduled_at >= lookback,
        )
        .order_by(PostQueue.scheduled_at.desc())
    ).all()

    history: list[tuple[PostQueue, dict]] = []
    for row in rows:
        payload = json.loads(row.payload_json or "{}")
        queued_destination_id = payload.get("destination_id")
        if queued_destination_id is None or queued_destination_id == destination.id:
            history.append((row, payload))
    return history


def _eligible_drafts(db: Session, destination: Destination, *, recent_texts: set[str]) -> list[PostDraft]:
    rows = db.scalars(
        select(PostDraft)
        .where(
            PostDraft.project_id == destination.project_id,
            PostDraft.status == "approved",
            or_(PostDraft.destination_id.is_(None), PostDraft.destination_id == destination.id),
        )
        .order_by(PostDraft.priority.desc(), PostDraft.approved_at.asc(), PostDraft.updated_at.asc())
    ).all()

    eligible: list[PostDraft] = []
    for draft in rows:
        if draft.body.strip() in recent_texts:
            continue
        eligible.append(draft)
    return eligible


def preview_destination_cadence(db: Session, destination: Destination, *, now: datetime | None = None) -> CadencePreview:
    current_time = now or datetime.now(timezone.utc)
    history = _history_for_destination(db, destination, now=current_time)
    recent_texts = {str(payload.get("text") or "").strip() for _, payload in history if str(payload.get("text") or "").strip()}
    eligible_drafts = _eligible_drafts(db, destination, recent_texts=recent_texts)

    day_start, day_end = _local_day_bounds(current_time, destination)
    queued_today = sum(1 for row, _ in history if day_start <= row.scheduled_at < day_end)
    cooldown_minutes = COOLDOWN_BY_MODE.get(destination.cadence_mode, 180)

    last_activity_at = None
    if history:
        newest_row = history[0][0]
        last_activity_at = newest_row.posted_at or newest_row.scheduled_at

    cooldown_until = None
    if last_activity_at is not None:
        cooldown_until = last_activity_at + timedelta(minutes=cooldown_minutes)

    base_time = current_time
    if cooldown_until and cooldown_until > base_time:
        base_time = cooldown_until

    next_window_at = compute_scheduled_at(
        index=0,
        base_time=base_time,
        default_delay_minutes=5,
        jitter_minutes=0,
        windows=json.loads(destination.windows_json or "[]"),
        timezone_name=destination.timezone,
    )

    blocked_reason = None
    if queued_today >= destination.daily_post_target:
        blocked_reason = "daily_target_met"
    elif cooldown_until and cooldown_until > current_time:
        blocked_reason = "cooldown_active"
    elif not eligible_drafts:
        blocked_reason = "no_approved_drafts"

    return CadencePreview(
        destination=destination,
        project=destination.project,
        queued_today=queued_today,
        cooldown_minutes=cooldown_minutes,
        cooldown_until=cooldown_until,
        next_window_at=next_window_at,
        eligible_drafts=eligible_drafts,
        blocked_reason=blocked_reason,
    )


def build_cadence_previews(
    db: Session,
    *,
    project_slug: str | None = None,
    now: datetime | None = None,
) -> list[CadencePreview]:
    stmt = (
        select(Destination)
        .join(Project)
        .where(Destination.active.is_(True), Project.active.is_(True))
        .order_by(Project.name.asc(), Destination.platform.asc(), Destination.name.asc())
    )
    if project_slug:
        stmt = stmt.where(Project.slug == project_slug)

    rows = db.scalars(stmt).all()
    previews = [preview_destination_cadence(db, destination, now=now) for destination in rows]
    previews.sort(
        key=lambda preview: (
            1 if preview.blocked_reason else 0,
            preview.next_window_at or datetime.max.replace(tzinfo=timezone.utc),
            preview.project.name.lower(),
            preview.destination.name.lower(),
        )
    )
    return previews
