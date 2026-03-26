from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..dates import ensure_utc
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
def _parse_quiet_range(value: str) -> tuple[int, int] | None:
    try:
        start_text, end_text = value.split("-", 1)
        start_hour, start_minute = [int(part) for part in start_text.split(":", 1)]
        end_hour, end_minute = [int(part) for part in end_text.split(":", 1)]
    except ValueError:
        return None

    start = start_hour * 60 + start_minute
    end = end_hour * 60 + end_minute
    if not (0 <= start <= 1439 and 0 <= end <= 1439):
        return None
    return start, end


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


def _draft_score(draft: PostDraft, destination: Destination, *, now: datetime) -> int:
    score = draft.priority

    kind_bonus = {
        "fresh": 24,
        "evergreen": 14,
        "resurface": 8,
        "support": 5,
    }
    source_bonus = {
        "repo_update": 12,
        "manual": 6,
        "evergreen": 4,
        "resurface": 3,
        "support": 2,
    }

    score += kind_bonus.get(draft.kind, 0)
    score += source_bonus.get(draft.source_type, 0)

    approved_at = ensure_utc(draft.approved_at or draft.updated_at or now)
    waiting_hours = max(0, int((now - approved_at).total_seconds() // 3600))
    score += min(waiting_hours // 4, 12)

    if destination.cadence_mode == "launch" and draft.kind == "fresh":
        score += 18
    if destination.cadence_mode == "quiet" and draft.kind in {"evergreen", "resurface"}:
        score += 18
    if destination.cadence_mode == "aggressive" and draft.source_type == "repo_update":
        score += 10

    try:
        notes = json.loads(draft.notes_json or "{}")
    except Exception:
        notes = {}

    if notes.get("generator") == "context_intake":
        score += 8

    return score


def _eligible_drafts(db: Session, destination: Destination, *, recent_texts: set[str], now: datetime) -> list[PostDraft]:
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
    eligible.sort(
        key=lambda draft: (
            -_draft_score(draft, destination, now=now),
            draft.approved_at or draft.updated_at or now,
            draft.id,
        )
    )
    return eligible


def _is_quiet_time(moment: datetime, destination: Destination, quiet_hours: list[str]) -> bool:
    if not quiet_hours:
        return False

    local_time = moment.astimezone(_zone_for_destination(destination))
    minute_of_day = local_time.hour * 60 + local_time.minute
    for item in quiet_hours:
        parsed = _parse_quiet_range(item)
        if parsed is None:
            continue
        start, end = parsed
        if start == end:
            return True
        if start < end:
            if start <= minute_of_day < end:
                return True
        else:
            if minute_of_day >= start or minute_of_day < end:
                return True
    return False


def _candidate_window_after(
    destination: Destination,
    *,
    base_time: datetime,
    quiet_hours: list[str],
) -> datetime | None:
    candidate = compute_scheduled_at(
        index=0,
        base_time=base_time,
        default_delay_minutes=5,
        jitter_minutes=0,
        windows=json.loads(destination.windows_json or "[]"),
        timezone_name=destination.timezone,
    )

    attempts = 0
    while quiet_hours and _is_quiet_time(candidate, destination, quiet_hours) and attempts < 14:
        candidate = compute_scheduled_at(
            index=0,
            base_time=candidate + timedelta(minutes=1),
            default_delay_minutes=5,
            jitter_minutes=0,
            windows=json.loads(destination.windows_json or "[]"),
            timezone_name=destination.timezone,
        )
        attempts += 1

    return candidate


def preview_destination_cadence(
    db: Session,
    destination: Destination,
    *,
    now: datetime | None = None,
    quiet_hours: list[str] | None = None,
) -> CadencePreview:
    current_time = now or datetime.now(timezone.utc)
    history = _history_for_destination(db, destination, now=current_time)
    recent_texts = {str(payload.get("text") or "").strip() for _, payload in history if str(payload.get("text") or "").strip()}
    eligible_drafts = _eligible_drafts(db, destination, recent_texts=recent_texts, now=current_time)
    quiet_hours = quiet_hours or []

    day_start, day_end = _local_day_bounds(current_time, destination)
    queued_today = sum(1 for row, _ in history if day_start <= ensure_utc(row.scheduled_at) < day_end)
    cooldown_minutes = COOLDOWN_BY_MODE.get(destination.cadence_mode, 180)

    last_activity_at = None
    if history:
        newest_row = history[0][0]
        last_activity_at = ensure_utc(newest_row.posted_at or newest_row.scheduled_at)

    cooldown_until = None
    if last_activity_at is not None:
        cooldown_until = last_activity_at + timedelta(minutes=cooldown_minutes)

    base_time = current_time
    if cooldown_until and cooldown_until > base_time:
        base_time = cooldown_until

    if queued_today >= destination.daily_post_target:
        base_time = day_end + timedelta(minutes=1)

    next_window_at = _candidate_window_after(destination, base_time=base_time, quiet_hours=quiet_hours)

    blocked_reason = None
    if queued_today >= destination.daily_post_target:
        blocked_reason = "daily_target_met"
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
    quiet_hours: list[str] | None = None,
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
    previews = [preview_destination_cadence(db, destination, now=now, quiet_hours=quiet_hours) for destination in rows]
    previews.sort(
        key=lambda preview: (
            1 if preview.blocked_reason else 0,
            preview.next_window_at or datetime.max.replace(tzinfo=timezone.utc),
            preview.project.name.lower(),
            preview.destination.name.lower(),
        )
    )
    return previews
