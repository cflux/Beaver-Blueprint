from pydantic import BaseModel, Field
from datetime import datetime


class ProgressCreate(BaseModel):
    note: str = Field(min_length=1)
    percentage: int = Field(ge=0, le=100)
    milestone_id: int | None = None
    created_by: str = "human"


class ProgressResponse(BaseModel):
    id: int
    project_id: int
    milestone_id: int | None
    note: str
    percentage: int
    created_at: datetime
    created_by: str

    model_config = {"from_attributes": True}
