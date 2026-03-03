from sqlalchemy.ext.asyncio import AsyncSession
from ..models import ActivityLog


async def log_activity(
    db: AsyncSession,
    project_id: int,
    entity_type: str,
    entity_id: int,
    action: str,
    actor: str = "human",
    details: dict | None = None,
):
    entry = ActivityLog(
        project_id=project_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        details=details,
        actor=actor,
    )
    db.add(entry)
    await db.flush()
    return entry
