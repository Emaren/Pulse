from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import Template
from ..schemas import TemplateIn, TemplateOut
from ..services.catalog import seed_templates

router = APIRouter(prefix="/templates", tags=["templates"])


def _to_out(item: Template) -> TemplateOut:
    return TemplateOut(
        id=item.id,
        platform=item.platform,
        name=item.name,
        body=item.body,
        is_active=item.is_active,
    )


@router.get("", response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db)) -> list[TemplateOut]:
    rows = db.scalars(select(Template).order_by(Template.id.asc())).all()
    return [_to_out(row) for row in rows]


@router.post("", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(payload: TemplateIn, db: Session = Depends(get_db)) -> TemplateOut:
    existing = db.scalar(select(Template).where(Template.platform == payload.platform, Template.name == payload.name))
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Template already exists: {payload.platform}/{payload.name}")

    template = Template(
        platform=payload.platform,
        name=payload.name,
        body=payload.body,
        is_active=payload.is_active,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _to_out(template)


@router.post("/seed", response_model=list[TemplateOut])
def seed_template_catalog(db: Session = Depends(get_db)) -> list[TemplateOut]:
    created = seed_templates(db)
    if created:
        db.commit()

    rows = db.scalars(select(Template).order_by(Template.id.asc())).all()
    return [_to_out(row) for row in rows]


@router.put("", response_model=list[TemplateOut])
def upsert_templates(payload: list[TemplateIn], db: Session = Depends(get_db)) -> list[TemplateOut]:
    existing = {(t.platform, t.name): t for t in db.scalars(select(Template)).all()}

    for item in payload:
        key = (item.platform, item.name)
        template = existing.get(key)
        if template is None:
            template = Template(platform=item.platform, name=item.name)
            db.add(template)

        template.body = item.body
        template.is_active = item.is_active

    db.commit()

    rows = db.scalars(select(Template).order_by(Template.id.asc())).all()
    return [_to_out(row) for row in rows]


@router.put("/{template_id}", response_model=TemplateOut)
def update_template(template_id: int, payload: TemplateIn, db: Session = Depends(get_db)) -> TemplateOut:
    template = db.get(Template, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")

    duplicate = db.scalar(
        select(Template).where(
            Template.platform == payload.platform,
            Template.name == payload.name,
            Template.id != template_id,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail=f"Template already exists: {payload.platform}/{payload.name}")

    template.platform = payload.platform
    template.name = payload.name
    template.body = payload.body
    template.is_active = payload.is_active

    db.commit()
    db.refresh(template)
    return _to_out(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int, db: Session = Depends(get_db)) -> Response:
    template = db.get(Template, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
