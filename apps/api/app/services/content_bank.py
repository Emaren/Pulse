from __future__ import annotations

import json
from datetime import datetime, timezone

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import PostDraft, Project, Template
from .catalog import CONTENT_DIR
from .context_drafts import render_context_template
from .draft_queue import record_audit_event


PLAYBOOKS_FILE = CONTENT_DIR / "playbooks.yml"


def _playbooks() -> list[dict]:
    if not PLAYBOOKS_FILE.exists():
        return []
    payload = yaml.safe_load(PLAYBOOKS_FILE.read_text()) or {}
    return list(payload.get("playbooks") or [])


def _project_tokens(project: Project) -> dict[str, str]:
    tags = [str(tag).strip() for tag in json.loads(project.tags_json or "[]") if str(tag).strip()]
    tag1 = tags[0] if len(tags) > 0 else project.slug.replace("-", " ")
    tag2 = tags[1] if len(tags) > 1 else tag1
    tag3 = tags[2] if len(tags) > 2 else tag2
    return {
        "project_name": project.name,
        "project_slug": project.slug,
        "url": project.website_url,
        "tag1": tag1,
        "tag2": tag2,
        "tag3": tag3,
    }


def _render_update(template_text: str, project: Project) -> str:
    rendered = template_text
    for key, value in _project_tokens(project).items():
        rendered = rendered.replace(f"{{{key}}}", value)
    return rendered.strip()


def _resolve_platform_template(db: Session, platform: str, template_name: str = "default") -> Template | None:
    template = db.scalar(
        select(Template).where(
            Template.platform == platform,
            Template.name == template_name,
            Template.is_active.is_(True),
        )
    )
    if template is not None:
        return template
    return db.scalar(
        select(Template)
        .where(Template.platform == platform, Template.is_active.is_(True))
        .order_by(Template.id.asc())
    )


def _draft_notes(platform: str, template: Template, playbook_key: str) -> str:
    return json.dumps(
        {
            "generator": "content_bank",
            "playbook_key": playbook_key,
            "requested_platform": platform,
            "template_name": template.name,
        }
    )


def seed_content_bank(
    db: Session,
    *,
    project_slug: str | None = None,
    platforms: list[str] | None = None,
    auto_approve: bool = True,
    limit_per_project: int = 4,
) -> list[PostDraft]:
    selected_platforms = platforms or ["facebook", "x"]
    project_stmt = select(Project).where(Project.active.is_(True)).order_by(Project.name.asc())
    if project_slug:
        project_stmt = project_stmt.where(Project.slug == project_slug)
    projects = db.scalars(project_stmt).all()
    playbooks = _playbooks()

    created: list[PostDraft] = []
    approved_at = datetime.now(timezone.utc) if auto_approve else None

    for project in projects:
        created_for_project = 0
        templates_by_platform = {
            platform: _resolve_platform_template(db, platform)
            for platform in selected_platforms
        }

        # Walk playbooks first so multi-platform seeding distributes across the
        # selected voices instead of exhausting the first platform only.
        for playbook in playbooks:
            if created_for_project >= limit_per_project:
                break

            playbook_key = str(playbook.get("key") or "").strip()
            update_template = str(playbook.get("update_template") or "").strip()
            if not playbook_key or not update_template:
                continue

            for platform in selected_platforms:
                if created_for_project >= limit_per_project:
                    break

                template = templates_by_platform.get(platform)
                if template is None:
                    continue

                source_ref = f"content-bank:{project.slug}:{platform}:{playbook_key}"
                existing = db.scalar(
                    select(PostDraft).where(
                        PostDraft.project_id == project.id,
                        PostDraft.source_ref == source_ref,
                    )
                )
                if existing is not None:
                    continue

                update_text = _render_update(update_template, project)
                draft = PostDraft(
                    project_id=project.id,
                    destination_id=None,
                    title=f"{project.name}: {playbook_key.replace('_', ' ')}",
                    body=render_context_template(template.body, project, update_text),
                    source_type=str(playbook.get("source_type") or "evergreen"),
                    kind=str(playbook.get("kind") or "evergreen"),
                    status="approved" if auto_approve else "draft",
                    priority=int(playbook.get("priority") or 40),
                    source_ref=source_ref,
                    notes_json=_draft_notes(platform, template, playbook_key),
                    approved_at=approved_at,
                )
                db.add(draft)
                db.flush()

                record_audit_event(
                    db,
                    "content_bank_draft_seeded",
                    "post_draft",
                    str(draft.id),
                    "Draft seeded from evergreen content bank",
                    {
                        "project_slug": project.slug,
                        "platform": platform,
                        "playbook_key": playbook_key,
                        "auto_approve": auto_approve,
                    },
                )

                created.append(draft)
                created_for_project += 1

    if created:
        record_audit_event(
            db,
            "content_bank_seed_completed",
            "automation",
            None,
            "Evergreen content bank seeded",
            {
                "project_slug": project_slug,
                "platforms": selected_platforms,
                "auto_approve": auto_approve,
                "limit_per_project": limit_per_project,
                "created_count": len(created),
            },
        )

    return created
