from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func

from ..database import get_db
from ..models import Project, Issue, ActivityLog
from ..schemas.project import DashboardResponse, ProjectResponse
from ..schemas.activity import ActivityResponse

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    # All projects
    result = await db.execute(select(Project).order_by(Project.updated_at.desc()))
    projects = result.scalars().all()

    active = sum(1 for p in projects if p.status == "active")

    # Total open issues
    open_issues = await db.execute(
        select(sa_func.count()).select_from(Issue).where(Issue.status != "closed")
    )

    # Recent activity
    activity_result = await db.execute(
        select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(20)
    )

    return DashboardResponse(
        projects=projects,
        total_projects=len(projects),
        active_projects=active,
        total_open_issues=open_issues.scalar() or 0,
        recent_activity=activity_result.scalars().all(),
    )
