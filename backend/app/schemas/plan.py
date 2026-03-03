from pydantic import BaseModel
from datetime import datetime


class PlanUpdate(BaseModel):
    content: str
    updated_by: str = "human"


class PlanResponse(BaseModel):
    id: int
    project_id: int
    content: str
    version: int
    updated_at: datetime
    updated_by: str

    model_config = {"from_attributes": True}


class PlanVersionResponse(BaseModel):
    id: int
    plan_id: int
    version: int
    content: str
    created_at: datetime
    created_by: str

    model_config = {"from_attributes": True}
