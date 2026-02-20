from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import Template
from ..schemas import TemplateIn, TemplateOut

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
