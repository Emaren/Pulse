from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import Destination, Project
from ..schemas import DestinationIn, DestinationOut

router = APIRouter(prefix="/destinations", tags=["destinations"])


def _to_out(item: Destination) -> DestinationOut:
    return DestinationOut(
        id=item.id,
        project_slug=item.project.slug,
        platform=item.platform,
        name=item.name,
        external_ref=item.external_ref,
        timezone=item.timezone,
        cadence_mode=item.cadence_mode,
        daily_post_target=item.daily_post_target,
        windows=json.loads(item.windows_json or "[]"),
        requires_approval=item.requires_approval,
        active=item.active,
    )


@router.get("", response_model=list[DestinationOut])
def list_destinations(db: Session = Depends(get_db)) -> list[DestinationOut]:
    rows = db.scalars(select(Destination).order_by(Destination.id.asc())).all()
    return [_to_out(row) for row in rows]


@router.put("", response_model=list[DestinationOut])
def upsert_destinations(payload: list[DestinationIn], db: Session = Depends(get_db)) -> list[DestinationOut]:
    projects = {project.slug: project for project in db.scalars(select(Project)).all()}
    existing = {
        (item.project_id, item.platform, item.name.lower()): item
        for item in db.scalars(select(Destination)).all()
    }

    for item in payload:
        project = projects.get(item.project_slug)
        if project is None:
            raise HTTPException(status_code=404, detail=f"Project not found: {item.project_slug}")

        key = (project.id, item.platform, item.name.lower())
        destination = existing.get(key)
        if destination is None:
            destination = Destination(project_id=project.id, platform=item.platform, name=item.name)
            db.add(destination)

        destination.external_ref = item.external_ref
        destination.timezone = item.timezone
        destination.cadence_mode = item.cadence_mode
        destination.daily_post_target = item.daily_post_target
        destination.windows_json = json.dumps(item.windows)
        destination.requires_approval = item.requires_approval
        destination.active = item.active

    db.commit()

    rows = db.scalars(select(Destination).order_by(Destination.id.asc())).all()
    return [_to_out(row) for row in rows]
