from pydantic import BaseModel, Field
from datetime import datetime, date


class MilestoneCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    due_date: date | None = None


class MilestoneUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: date | None = None
    status: str | None = None


class MilestoneResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None
    due_date: date | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
