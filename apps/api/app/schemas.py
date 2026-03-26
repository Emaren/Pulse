from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


DEFAULT_WINDOWS = ["08:00", "10:00", "14:00", "19:00", "23:30"]


class ProjectIn(BaseModel):
    slug: str = Field(min_length=2, max_length=128, pattern=r"^[a-z0-9-]+$")
    name: str
    website_url: str
    tone: str = "neutral"
    tags: list[str] = Field(default_factory=list)
    active: bool = True


class ProjectUpdateIn(BaseModel):
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


class DestinationIn(BaseModel):
    project_slug: str
    platform: Literal["facebook", "x"]
    name: str
    external_ref: str | None = None
    timezone: str = "America/Edmonton"
    cadence_mode: Literal["gentle", "normal", "aggressive", "launch", "quiet"] = "normal"
    daily_post_target: int = Field(default=2, ge=0, le=10)
    windows: list[str] = Field(default_factory=lambda: DEFAULT_WINDOWS.copy())
    requires_approval: bool = True
    active: bool = True


class DestinationOut(DestinationIn):
    id: int


class DraftIn(BaseModel):
    project_slug: str
    destination_id: int | None = None
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    source_type: Literal["manual", "repo_update", "evergreen", "resurface", "support"] = "manual"
    kind: Literal["fresh", "evergreen", "resurface", "support"] = "fresh"
    priority: int = Field(default=50, ge=0, le=100)
    source_ref: str | None = None
    notes: dict[str, Any] = Field(default_factory=dict)
    scheduled_for: datetime | None = None


class DraftQueueIn(BaseModel):
    destination_id: int | None = None
    scheduled_at: datetime | None = None
    mode: Literal["exact", "next_slot"] = "exact"


class DraftStatusUpdateIn(BaseModel):
    status: Literal["draft", "needs_attention", "rejected", "archived"]


class ContextDraftIn(BaseModel):
    project_slug: str
    change_summary: str = Field(min_length=1)
    title: str | None = Field(default=None, max_length=255)
    platform: Literal["facebook", "x"] = "facebook"
    destination_id: int | None = None
    template_name: str = "default"
    auto_approve: bool = False
    notes: dict[str, Any] = Field(default_factory=dict)
    source_ref: str | None = None


class DraftOut(BaseModel):
    id: int
    project_id: int
    project_slug: str
    destination_id: int | None
    destination_name: str | None
    platform: str | None
    title: str
    body: str
    source_type: str
    kind: str
    status: str
    priority: int
    source_ref: str | None
    notes: dict[str, Any]
    approved_at: datetime | None
    queued_at: datetime | None
    published_at: datetime | None
    scheduled_for: datetime | None
    published_queue_id: int | None
    created_at: datetime
    updated_at: datetime


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
