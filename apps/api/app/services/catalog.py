from __future__ import annotations

import json
from pathlib import Path

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Project, Template


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "packages" / "shared" / "content").exists():
            return parent
    raise FileNotFoundError("Could not locate Pulse content catalog")


CONTENT_DIR = _repo_root() / "packages" / "shared" / "content"
PROJECTS_FILE = CONTENT_DIR / "projects.yml"
TEMPLATES_DIR = CONTENT_DIR / "templates"


def seed_projects(db: Session) -> int:
    if not PROJECTS_FILE.exists():
        return 0

    payload = yaml.safe_load(PROJECTS_FILE.read_text()) or {}
    items = payload.get("projects") or []
    existing = {project.slug: project for project in db.scalars(select(Project)).all()}
    created = 0

    for item in items:
        slug = str(item.get("slug") or "").strip()
        if not slug or slug in existing:
            continue

        db.add(
            Project(
                slug=slug,
                name=str(item.get("name") or slug).strip(),
                website_url=str(item.get("url") or "").strip(),
                tone=str(item.get("tone") or "neutral").strip() or "neutral",
                tags_json=json.dumps(list(item.get("tags") or [])),
                active=True,
            )
        )
        created += 1

    return created


def seed_templates(db: Session) -> int:
    if not TEMPLATES_DIR.exists():
        return 0

    existing = {(template.platform, template.name): template for template in db.scalars(select(Template)).all()}
    created = 0

    for path in sorted(TEMPLATES_DIR.glob("*/*.txt")):
        platform = path.parent.name
        name = path.stem
        key = (platform, name)
        if key in existing:
            continue

        db.add(
            Template(
                platform=platform,
                name=name,
                body=path.read_text().strip(),
                is_active=True,
            )
        )
        created += 1

    return created


def seed_catalog(db: Session) -> dict[str, int]:
    return {
        "projects": seed_projects(db),
        "templates": seed_templates(db),
    }
