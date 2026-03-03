from pydantic import BaseModel, Field
from datetime import datetime


class DocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    content: str = ""
    category: str = "other"
    sort_order: int = 0
    updated_by: str = "human"


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    sort_order: int | None = None
    updated_by: str = "human"


class DocumentResponse(BaseModel):
    id: int
    project_id: int
    title: str
    slug: str
    content: str
    category: str
    sort_order: int
    created_at: datetime
    updated_at: datetime
    updated_by: str

    model_config = {"from_attributes": True}
