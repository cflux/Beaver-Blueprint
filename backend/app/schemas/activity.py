from pydantic import BaseModel
from datetime import datetime


class ActivityResponse(BaseModel):
    id: int
    project_id: int
    entity_type: str
    entity_id: int
    action: str
    details: dict | None
    actor: str
    created_at: datetime

    model_config = {"from_attributes": True}
