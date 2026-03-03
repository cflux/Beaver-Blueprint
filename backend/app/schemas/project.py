from pydantic import BaseModel, Field
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str = Field(min_length=1, max_length=100)
    status: str = "concept"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    status: str | None = None
    goal: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    status: str
    category: str
    goal: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int


class ProjectStats(BaseModel):
    open_issues: int = 0
    closed_issues: int = 0
    progress: int = 0
    milestones_total: int = 0
    milestones_completed: int = 0


class DashboardResponse(BaseModel):
    projects: list[ProjectResponse]
    total_projects: int
    active_projects: int
    total_open_issues: int
    recent_activity: list["ActivityResponse"] = []


from .activity import ActivityResponse  # noqa: E402
DashboardResponse.model_rebuild()
