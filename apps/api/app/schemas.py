from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ProjectIn(BaseModel):
    slug: str
    name: str
    website_url: str
    tone: str = "neutral"
    tags: list[str] = Field(default_factory=list)
    active: bool = True


class ProjectOut(ProjectIn):
    id: int


class TemplateIn(BaseModel):
    platform: str
    name: str
    body: str
    is_active: bool = True


class TemplateOut(TemplateIn):
    id: int


class AccountConnectIn(BaseModel):
    account_name: str
    access_token: str
    refresh_token: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class AccountOut(BaseModel):
    id: int
    platform: str
    account_name: str
    connected_at: datetime


class QueueScheduleIn(BaseModel):
    project_slug: str | None = None
    updates: list[str] = Field(default_factory=list)
    platforms: list[str] = Field(default_factory=lambda: ["x", "facebook"])
    scheduled_at: datetime | None = None

    # explicit scheduling semantics:
    # - exact: honor scheduled_at as-is (no cadence/jitter modification)
    # - next_slot: apply your cadence/rounding logic server-side
    mode: Literal["exact", "next_slot"] = "next_slot"


class QueueOut(BaseModel):
    id: int
    project_id: int | None
    platform: str
    status: str
    scheduled_at: datetime
    attempts: int
    last_error: str | None
    external_post_id: str | None
    posted_at: datetime | None
    payload: dict[str, Any]


class AuditEventOut(BaseModel):
    id: int
    event_type: str
    entity_type: str
    entity_id: str | None
    message: str
    data: dict[str, Any]
    created_at: datetime