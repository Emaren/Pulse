from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import Project
from ..schemas import ProjectIn, ProjectOut

router = APIRouter(prefix="/projects", tags=["projects"])


def _to_out(project: Project) -> ProjectOut:
    return ProjectOut(
        id=project.id,
        slug=project.slug,
        name=project.name,
        website_url=project.website_url,
        tone=project.tone,
        tags=json.loads(project.tags_json or "[]"),
        active=project.active,
    )


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)) -> list[ProjectOut]:
    rows = db.scalars(select(Project).order_by(Project.id.asc())).all()
    return [_to_out(row) for row in rows]


@router.put("", response_model=list[ProjectOut])
def upsert_projects(payload: list[ProjectIn], db: Session = Depends(get_db)) -> list[ProjectOut]:
    existing = {p.slug: p for p in db.scalars(select(Project)).all()}

    for item in payload:
        project = existing.get(item.slug)
        if project is None:
            project = Project(slug=item.slug)
            db.add(project)

        project.name = item.name
        project.website_url = item.website_url
        project.tone = item.tone
        project.tags_json = json.dumps(item.tags)
        project.active = item.active

    db.commit()

    rows = db.scalars(select(Project).order_by(Project.id.asc())).all()
    return [_to_out(row) for row in rows]
