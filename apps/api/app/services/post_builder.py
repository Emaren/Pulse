from __future__ import annotations

from typing import Any

from ..models import Project


def build_post_payloads(project: Project | None, updates: list[str], platforms: list[str]) -> list[dict[str, Any]]:
    """
    Build per-platform payloads.

    Rules:
    - NEVER auto-prepend "Pulse:" (or any project name prefix).
    - If a project has a website_url, append it (but don't duplicate if already included).
    """
    project_url = (project.website_url or "").strip() if project else ""

    payloads: list[dict[str, Any]] = []
    for platform in platforms:
        for update in updates:
            text = (update or "").strip()

            # Append project URL if present and not already included
            if project_url and project_url not in text:
                text = f"{text}\n\n{project_url}".strip()

            payloads.append(
                {
                    "platform": platform,
                    "text": text,
                    "project_slug": project.slug if project else None,
                }
            )

    return payloads
