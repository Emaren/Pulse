from __future__ import annotations

import json
from hashlib import sha256

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dates import ensure_utc
from ..deps import get_db
from ..models import ContextSignal, Project
from ..schemas import ContextDraftIn, ContextSignalIn, ContextSignalOut
from ..services.context_drafts import create_context_draft
from ..services.draft_queue import record_audit_event
from ..settings import settings

router = APIRouter(prefix="/signals", tags=["signals"])


def _normalize_summary(value: str) -> str:
    return " ".join(value.lower().split())


def _signal_fingerprint(payload: ContextSignalIn) -> str:
    destination_ref = str(payload.destination_id or 0)
    normalized = "|".join(
        [
            payload.project_slug.strip().lower(),
            payload.platform,
            destination_ref,
            payload.template_name.strip().lower(),
            _normalize_summary(payload.change_summary),
        ]
    )
    return sha256(normalized.encode("utf-8")).hexdigest()


def _require_admin_api_key(x_admin_key: str | None = Header(default=None, alias="X-Admin-Key")) -> None:
    expected = settings.admin_api_key.strip()
    if expected and x_admin_key != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin API key required")


def _to_out(item: ContextSignal, *, deduplicated: bool = False) -> ContextSignalOut:
    return ContextSignalOut(
        id=item.id,
        project_id=item.project_id,
        project_slug=item.project.slug,
        destination_id=item.destination_id,
        destination_name=item.destination.name if item.destination else None,
        platform=item.platform,
        template_name=item.template_name,
        title=item.title,
        change_summary=item.change_summary,
        source_ref=item.source_ref,
        fingerprint=item.fingerprint,
        status=item.status,
        auto_approve=item.auto_approve,
        draft_id=item.draft_id,
        draft_title=item.draft.title if item.draft else None,
        deduplicated=deduplicated,
        observed_at=ensure_utc(item.observed_at),
        created_at=ensure_utc(item.created_at),
        updated_at=ensure_utc(item.updated_at),
    )


def _draft_payload_for_signal(item: ContextSignal) -> ContextDraftIn:
    try:
        notes = json.loads(item.notes_json or "{}")
    except Exception:
        notes = {}

    notes = {
        **notes,
        "signal_id": item.id,
        "signal_fingerprint": item.fingerprint,
    }
    return ContextDraftIn(
        project_slug=item.project.slug,
        change_summary=item.change_summary,
        title=item.title,
        platform=item.platform,
        destination_id=item.destination_id,
        template_name=item.template_name,
        auto_approve=item.auto_approve,
        notes=notes,
        source_ref=item.source_ref,
    )


@router.get("", response_model=list[ContextSignalOut])
def list_signals(
    project_slug: str | None = None,
    signal_status: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> list[ContextSignalOut]:
    stmt = select(ContextSignal)
    if project_slug:
        stmt = stmt.join(Project).where(Project.slug == project_slug)
    if signal_status:
        stmt = stmt.where(ContextSignal.status == signal_status)

    stmt = stmt.order_by(ContextSignal.created_at.desc()).limit(limit)
    rows = db.scalars(stmt).all()
    return [_to_out(row) for row in rows]


@router.post("/ingest", response_model=ContextSignalOut)
def ingest_signal(
    payload: ContextSignalIn,
    _: None = Depends(_require_admin_api_key),
    db: Session = Depends(get_db),
) -> ContextSignalOut:
    project = db.scalar(select(Project).where(Project.slug == payload.project_slug))
    if project is None:
        raise HTTPException(status_code=404, detail=f"Project not found: {payload.project_slug}")

    fingerprint = _signal_fingerprint(payload)
    existing = db.scalar(select(ContextSignal).where(ContextSignal.fingerprint == fingerprint))
    if existing is not None:
        return _to_out(existing, deduplicated=True)

    signal = ContextSignal(
        project_id=project.id,
        destination_id=payload.destination_id,
        platform=payload.platform,
        template_name=payload.template_name,
        title=payload.title.strip() if payload.title and payload.title.strip() else None,
        change_summary=payload.change_summary.strip(),
        source_ref=payload.source_ref,
        fingerprint=fingerprint,
        status="received",
        auto_approve=payload.auto_approve,
        notes_json=json.dumps(payload.notes),
        observed_at=ensure_utc(payload.observed_at),
    )
    db.add(signal)
    db.flush()

    record_audit_event(
        db,
        "context_signal_ingested",
        "context_signal",
        str(signal.id),
        "Context signal ingested",
        {
            "project_slug": project.slug,
            "platform": payload.platform,
            "template_name": payload.template_name,
            "create_draft": payload.create_draft,
            "source_ref": payload.source_ref,
        },
    )

    if payload.create_draft:
        draft = create_context_draft(db, _draft_payload_for_signal(signal))
        signal.destination_id = draft.destination_id
        signal.title = draft.title
        signal.status = "drafted"
        signal.draft_id = draft.id

        record_audit_event(
            db,
            "context_signal_drafted",
            "context_signal",
            str(signal.id),
            "Context signal turned into a draft",
            {"draft_id": draft.id, "project_slug": project.slug},
        )

    db.commit()
    db.refresh(signal)
    return _to_out(signal)


@router.post("/{signal_id}/draft", response_model=ContextSignalOut)
def create_draft_from_signal(signal_id: int, db: Session = Depends(get_db)) -> ContextSignalOut:
    signal = db.get(ContextSignal, signal_id)
    if signal is None:
        raise HTTPException(status_code=404, detail="Signal not found")

    if signal.draft_id is not None:
        return _to_out(signal)

    draft = create_context_draft(db, _draft_payload_for_signal(signal))
    signal.destination_id = draft.destination_id
    signal.title = draft.title
    signal.status = "drafted"
    signal.draft_id = draft.id

    record_audit_event(
        db,
        "context_signal_drafted",
        "context_signal",
        str(signal.id),
        "Context signal turned into a draft",
        {"draft_id": draft.id, "project_slug": signal.project.slug},
    )

    db.commit()
    db.refresh(signal)
    return _to_out(signal)
