from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import Destination, PostDraft, PostQueue, Project
from ..schemas import ProjectIn, ProjectOut, ProjectUpdateIn
from ..services.catalog import seed_projects

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


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectIn, db: Session = Depends(get_db)) -> ProjectOut:
    existing = db.scalar(select(Project).where(Project.slug == payload.slug))
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Project already exists: {payload.slug}")

    project = Project(slug=payload.slug)
    project.name = payload.name
    project.website_url = payload.website_url
    project.tone = payload.tone
    project.tags_json = json.dumps(payload.tags)
    project.active = payload.active
    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_out(project)


@router.post("/seed", response_model=list[ProjectOut])
def seed_project_catalog(db: Session = Depends(get_db)) -> list[ProjectOut]:
    created = seed_projects(db)
    if created:
        db.commit()

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


@router.put("/{project_slug}", response_model=ProjectOut)
def update_project(project_slug: str, payload: ProjectUpdateIn, db: Session = Depends(get_db)) -> ProjectOut:
    project = db.scalar(select(Project).where(Project.slug == project_slug))
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    project.name = payload.name
    project.website_url = payload.website_url
    project.tone = payload.tone
    project.tags_json = json.dumps(payload.tags)
    project.active = payload.active

    db.commit()
    db.refresh(project)
    return _to_out(project)


@router.delete("/{project_slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_slug: str, db: Session = Depends(get_db)) -> Response:
    project = db.scalar(select(Project).where(Project.slug == project_slug))
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    destination_count = db.scalar(select(func.count()).select_from(Destination).where(Destination.project_id == project.id)) or 0
    draft_count = db.scalar(select(func.count()).select_from(PostDraft).where(PostDraft.project_id == project.id)) or 0
    queue_count = db.scalar(select(func.count()).select_from(PostQueue).where(PostQueue.project_id == project.id)) or 0

    if destination_count or draft_count or queue_count:
        raise HTTPException(
            status_code=400,
            detail=(
                "Project still has Pulse history attached "
                f"({destination_count} destinations, {draft_count} drafts, {queue_count} queue items). "
                "Deactivate it instead of deleting."
            ),
        )

    db.delete(project)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
