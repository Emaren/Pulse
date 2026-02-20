from __future__ import annotations

from typing import Any

from ..models import Project


def build_post_payloads(project: Project | None, updates: list[str], platforms: list[str]) -> list[dict[str, Any]]:
    project_name = project.name if project else "Pulse"
    project_url = project.website_url if project else ""

    payloads: list[dict[str, Any]] = []
    for platform in platforms:
        for update in updates:
            text = f"{project_name}: {update}".strip()
            if project_url:
                text = f"{text}\n\n{project_url}"

            payloads.append(
                {
                    "platform": platform,
                    "text": text,
                    "project_slug": project.slug if project else None,
                }
            )

    return payloads
