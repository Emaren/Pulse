from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..deps import get_db
from ..schemas import CadencePreviewOut, CadenceRunIn, CadenceRunItemOut, CadenceRunOut
from ..services.cadence import CadencePreview, build_cadence_previews
from ..services.draft_queue import queue_draft_for_destination, record_audit_event

router = APIRouter(prefix="/automation", tags=["automation"])


def _preview_to_out(preview: CadencePreview) -> CadencePreviewOut:
    recommended = preview.eligible_drafts[0] if preview.eligible_drafts else None
    return CadencePreviewOut(
        destination_id=preview.destination.id,
        project_id=preview.project.id,
        project_slug=preview.project.slug,
        project_name=preview.project.name,
        destination_name=preview.destination.name,
        platform=preview.destination.platform,
        cadence_mode=preview.destination.cadence_mode,
        daily_post_target=preview.destination.daily_post_target,
        queued_today=preview.queued_today,
        cooldown_minutes=preview.cooldown_minutes,
        cooldown_until=preview.cooldown_until,
        next_window_at=preview.next_window_at,
        eligible_drafts=len(preview.eligible_drafts),
        recommended_draft_id=recommended.id if recommended else None,
        recommended_draft_title=recommended.title if recommended else None,
        blocked_reason=preview.blocked_reason,
    )


@router.get("/cadence", response_model=list[CadencePreviewOut])
def preview_cadence(project_slug: str | None = None, db: Session = Depends(get_db)) -> list[CadencePreviewOut]:
    previews = build_cadence_previews(db, project_slug=project_slug)
    return [_preview_to_out(preview) for preview in previews]


@router.post("/cadence/run", response_model=CadenceRunOut)
def run_cadence(payload: CadenceRunIn, db: Session = Depends(get_db)) -> CadenceRunOut:
    run_at = datetime.now(timezone.utc)
    previews = build_cadence_previews(db, project_slug=payload.project_slug, now=run_at)

    used_draft_ids: set[int] = set()
    queued_count = 0
    items: list[CadenceRunItemOut] = []

    for preview in previews:
        recommended = preview.eligible_drafts[0] if preview.eligible_drafts else None

        if queued_count >= payload.limit:
            items.append(
                CadenceRunItemOut(
                    destination_id=preview.destination.id,
                    project_slug=preview.project.slug,
                    destination_name=preview.destination.name,
                    platform=preview.destination.platform,
                    draft_id=recommended.id if recommended else None,
                    draft_title=recommended.title if recommended else None,
                    scheduled_at=None,
                    status="skipped",
                    reason="run_limit_reached",
                )
            )
            continue

        if preview.blocked_reason or recommended is None or preview.next_window_at is None:
            items.append(
                CadenceRunItemOut(
                    destination_id=preview.destination.id,
                    project_slug=preview.project.slug,
                    destination_name=preview.destination.name,
                    platform=preview.destination.platform,
                    draft_id=recommended.id if recommended else None,
                    draft_title=recommended.title if recommended else None,
                    scheduled_at=preview.next_window_at,
                    status="skipped",
                    reason=preview.blocked_reason or "no_recommendation",
                )
            )
            continue

        if recommended.id in used_draft_ids:
            items.append(
                CadenceRunItemOut(
                    destination_id=preview.destination.id,
                    project_slug=preview.project.slug,
                    destination_name=preview.destination.name,
                    platform=preview.destination.platform,
                    draft_id=recommended.id,
                    draft_title=recommended.title,
                    scheduled_at=preview.next_window_at,
                    status="skipped",
                    reason="draft_already_allocated",
                )
            )
            continue

        queue_draft_for_destination(
            db,
            recommended,
            preview.destination,
            preview.next_window_at,
            mode="cadence_auto",
            source="cadence_run",
        )
        used_draft_ids.add(recommended.id)
        queued_count += 1

        items.append(
            CadenceRunItemOut(
                destination_id=preview.destination.id,
                project_slug=preview.project.slug,
                destination_name=preview.destination.name,
                platform=preview.destination.platform,
                draft_id=recommended.id,
                draft_title=recommended.title,
                scheduled_at=preview.next_window_at,
                status="queued",
                reason=None,
            )
        )

    record_audit_event(
        db,
        "cadence_run_completed",
        "automation",
        None,
        "Cadence automation run completed",
        {
            "project_slug": payload.project_slug,
            "queued_count": queued_count,
            "skipped_count": len(items) - queued_count,
            "limit": payload.limit,
        },
    )
    db.commit()

    return CadenceRunOut(
        run_at=run_at,
        queued_count=queued_count,
        skipped_count=len(items) - queued_count,
        items=items,
    )
