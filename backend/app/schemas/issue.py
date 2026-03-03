from pydantic import BaseModel, Field
from datetime import datetime


class IssueCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    status: str = "open"
    priority: str = "medium"
    labels: list[str] = []
    created_by: str = "human"


class IssueUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    labels: list[str] | None = None


class IssueResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None
    status: str
    priority: str
    labels: list[str] | None
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None
    created_by: str

    model_config = {"from_attributes": True}
