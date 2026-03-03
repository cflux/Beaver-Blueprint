from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import ActivityLog, Project
from ..schemas.activity import ActivityResponse
from .projects import get_project_by_slug

router = APIRouter(tags=["activity"])


@router.get("/activity", response_model=list[ActivityResponse])
async def global_activity(
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)
    )
    return result.scalars().all()


@router.get("/projects/{slug}/activity", response_model=list[ActivityResponse])
async def project_activity(
    slug: str,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.project_id == project.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
