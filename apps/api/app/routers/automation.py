from __future__ import annotations

from datetime import datetime, timezone
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..dates import ensure_utc
from ..models import AutomationPolicy, PostDraft
from ..schemas import AutomationSettingsIn, AutomationSettingsOut, ContentBankSeedIn, ContentBankSeedItemOut, ContentBankSeedOut
from ..deps import get_db
from ..schemas import CadencePreviewOut, CadenceRunIn, CadenceRunItemOut, CadenceRunOut
from ..services.automation_policy import get_or_create_policy
from ..services.cadence import CadencePreview, build_cadence_previews
from ..services.content_bank import seed_content_bank
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


def _policy_to_out(policy: AutomationPolicy) -> AutomationSettingsOut:
    return AutomationSettingsOut(
        cadence_enabled=policy.cadence_enabled,
        cadence_interval_minutes=policy.cadence_interval_minutes,
        cadence_run_limit=policy.cadence_run_limit,
        quiet_hours=json.loads(policy.quiet_hours_json or "[]"),
        last_cadence_run_at=ensure_utc(policy.last_cadence_run_at),
    )


def _draft_notes(draft_notes_json: str | None) -> dict:
    if not draft_notes_json:
        return {}
    try:
        return json.loads(draft_notes_json)
    except Exception:
        return {}


def _content_bank_item_out(draft: PostDraft) -> ContentBankSeedItemOut:
    notes = _draft_notes(draft.notes_json)
    return ContentBankSeedItemOut(
        draft_id=draft.id,
        project_slug=draft.project.slug,
        platform=notes.get("requested_platform", "facebook"),
        title=draft.title,
        kind=draft.kind,
        status=draft.status,
        playbook_key=notes.get("playbook_key"),
        source_ref=draft.source_ref,
    )


@router.get("/settings", response_model=AutomationSettingsOut)
def get_automation_settings(db: Session = Depends(get_db)) -> AutomationSettingsOut:
    policy = get_or_create_policy(db)
    db.commit()
    db.refresh(policy)
    return _policy_to_out(policy)


@router.put("/settings", response_model=AutomationSettingsOut)
def update_automation_settings(payload: AutomationSettingsIn, db: Session = Depends(get_db)) -> AutomationSettingsOut:
    policy = get_or_create_policy(db)
    policy.cadence_enabled = payload.cadence_enabled
    policy.cadence_interval_minutes = payload.cadence_interval_minutes
    policy.cadence_run_limit = payload.cadence_run_limit
    policy.quiet_hours_json = json.dumps(payload.quiet_hours)
    record_audit_event(
        db,
        "automation_policy_updated",
        "automation",
        str(policy.id),
        "Cadence automation policy updated",
        {
            "cadence_enabled": payload.cadence_enabled,
            "cadence_interval_minutes": payload.cadence_interval_minutes,
            "cadence_run_limit": payload.cadence_run_limit,
            "quiet_hours": payload.quiet_hours,
        },
    )
    db.commit()
    db.refresh(policy)
    return _policy_to_out(policy)


@router.get("/cadence", response_model=list[CadencePreviewOut])
def preview_cadence(project_slug: str | None = None, db: Session = Depends(get_db)) -> list[CadencePreviewOut]:
    policy = get_or_create_policy(db)
    db.commit()
    previews = build_cadence_previews(db, project_slug=project_slug, quiet_hours=json.loads(policy.quiet_hours_json or "[]"))
    return [_preview_to_out(preview) for preview in previews]


@router.post("/cadence/run", response_model=CadenceRunOut)
def run_cadence(payload: CadenceRunIn, db: Session = Depends(get_db)) -> CadenceRunOut:
    run_at = datetime.now(timezone.utc)
    policy = get_or_create_policy(db)
    previews = build_cadence_previews(
        db,
        project_slug=payload.project_slug,
        now=run_at,
        quiet_hours=json.loads(policy.quiet_hours_json or "[]"),
    )

    used_draft_ids: set[int] = set()
    queued_count = 0
    items: list[CadenceRunItemOut] = []
    limit = payload.limit or policy.cadence_run_limit

    for preview in previews:
        recommended = preview.eligible_drafts[0] if preview.eligible_drafts else None

        if queued_count >= limit:
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
            "limit": limit,
        },
    )
    policy.last_cadence_run_at = run_at
    db.commit()

    return CadenceRunOut(
        run_at=run_at,
        queued_count=queued_count,
        skipped_count=len(items) - queued_count,
        items=items,
    )


@router.post("/content-bank/seed", response_model=ContentBankSeedOut)
def seed_evergreen_content_bank(payload: ContentBankSeedIn, db: Session = Depends(get_db)) -> ContentBankSeedOut:
    drafts = seed_content_bank(
        db,
        project_slug=payload.project_slug,
        platforms=list(payload.platforms),
        auto_approve=payload.auto_approve,
        limit_per_project=payload.limit_per_project,
    )
    db.commit()

    return ContentBankSeedOut(
        created_count=len(drafts),
        items=[_content_bank_item_out(draft) for draft in drafts],
    )
