from pydantic import BaseModel, Field
from datetime import datetime


class ResearchItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    url: str | None = None
    notes: str = ""
    tag: str = ""
    created_by: str = "human"


class ResearchItemUpdate(BaseModel):
    title: str | None = None
    url: str | None = None
    notes: str | None = None
    tag: str | None = None


class TagRename(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class ResearchItemResponse(BaseModel):
    id: int
    project_id: int
    title: str
    url: str | None
    notes: str
    tag: str
    created_at: datetime
    created_by: str

    model_config = {"from_attributes": True}
