from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Destination, PostDraft, Project, Template
from ..schemas import ContextDraftIn
from .draft_queue import record_audit_event


def _normalize_tag(value: str) -> str:
    return "".join(character for character in value.lower() if character.isalnum())


def render_context_template(template_body: str, project: Project, change_summary: str) -> str:
    tags = json.loads(project.tags_json or "[]")
    tag1 = _normalize_tag(tags[0]) if len(tags) > 0 else project.slug.replace("-", "")
    tag2 = _normalize_tag(tags[1]) if len(tags) > 1 else tag1

    rendered = template_body
    replacements = {
        "project_name": project.name,
        "project_slug": project.slug,
        "update": change_summary.strip(),
        "url": project.website_url,
        "tag1": tag1 or project.slug.replace("-", ""),
        "tag2": tag2 or tag1 or project.slug.replace("-", ""),
    }
    for key, value in replacements.items():
        rendered = rendered.replace(f"{{{key}}}", value)

    lines = [line.rstrip() for line in rendered.splitlines()]
    compacted: list[str] = []
    previous_blank = False
    for line in lines:
        is_blank = not line.strip()
        if is_blank and previous_blank:
            continue
        compacted.append(line)
        previous_blank = is_blank
    return "\n".join(compacted).strip()


def _context_title(payload: ContextDraftIn, project: Project) -> str:
    if payload.title and payload.title.strip():
        return payload.title.strip()

    summary = payload.change_summary.strip().splitlines()[0]
    if len(summary) > 100:
        summary = f"{summary[:97].rstrip()}..."
    return f"{project.name}: {summary}"


def _resolve_context_destination(
    db: Session,
    project: Project,
    platform: str,
    destination_id: int | None,
) -> Destination | None:
    if destination_id is not None:
        destination = db.get(Destination, destination_id)
        if destination is None or not destination.active:
            raise HTTPException(status_code=404, detail="Active destination not found")
        if destination.project_id != project.id:
            raise HTTPException(status_code=400, detail="Destination does not belong to the selected project")
        if destination.platform != platform:
            raise HTTPException(status_code=400, detail="Destination platform does not match the requested platform")
        return destination

    return db.scalar(
        select(Destination)
        .where(
            Destination.project_id == project.id,
            Destination.platform == platform,
            Destination.active.is_(True),
        )
        .order_by(Destination.id.asc())
    )


def create_context_draft(db: Session, payload: ContextDraftIn) -> PostDraft:
    project = db.scalar(select(Project).where(Project.slug == payload.project_slug))
    if project is None:
        raise HTTPException(status_code=404, detail=f"Project not found: {payload.project_slug}")

    destination = _resolve_context_destination(db, project, payload.platform, payload.destination_id)
    template = db.scalar(
        select(Template).where(
            Template.platform == payload.platform,
            Template.name == payload.template_name,
            Template.is_active.is_(True),
        )
    )
    if template is None:
        raise HTTPException(status_code=404, detail=f"Active template not found: {payload.platform}/{payload.template_name}")

    approved_at = datetime.now(timezone.utc) if payload.auto_approve else None
    notes = {
        "generator": "context_intake",
        "requested_platform": payload.platform,
        "template_name": payload.template_name,
        **payload.notes,
    }

    draft = PostDraft(
        project_id=project.id,
        destination_id=destination.id if destination else None,
        title=_context_title(payload, project),
        body=render_context_template(template.body, project, payload.change_summary),
        source_type="repo_update",
        kind="fresh",
        status="approved" if payload.auto_approve else "draft",
        priority=60,
        source_ref=payload.source_ref,
        notes_json=json.dumps(notes),
        approved_at=approved_at,
    )
    db.add(draft)
    db.flush()

    record_audit_event(
        db,
        "draft_context_generated",
        "post_draft",
        str(draft.id),
        "Draft generated from observed project context",
        {
            "project_slug": project.slug,
            "platform": payload.platform,
            "template_name": payload.template_name,
            "auto_approve": payload.auto_approve,
        },
    )

    return draft
