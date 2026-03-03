from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Plan, PlanVersion
from ..schemas.plan import PlanUpdate, PlanResponse, PlanVersionResponse
from ..services.activity import log_activity
from .projects import get_project_by_slug

router = APIRouter(tags=["plans"])


@router.get("/projects/{slug}/plan", response_model=PlanResponse)
async def get_plan(slug: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(select(Plan).where(Plan.project_id == project.id))
    plan = result.scalar_one_or_none()
    if not plan:
        # Auto-create empty plan
        plan = Plan(project_id=project.id, content="", version=1)
        db.add(plan)
        await db.flush()
    return plan


@router.put("/projects/{slug}/plan", response_model=PlanResponse)
async def update_plan(slug: str, data: PlanUpdate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(select(Plan).where(Plan.project_id == project.id))
    plan = result.scalar_one_or_none()

    if not plan:
        plan = Plan(project_id=project.id, content=data.content, version=1, updated_by=data.updated_by)
        db.add(plan)
        await db.flush()
    else:
        # Snapshot current version
        snapshot = PlanVersion(
            plan_id=plan.id,
            version=plan.version,
            content=plan.content,
            created_by=plan.updated_by,
        )
        db.add(snapshot)

        plan.content = data.content
        plan.version += 1
        plan.updated_by = data.updated_by

    await db.flush()
    await db.refresh(plan)
    await log_activity(db, project.id, "plan", plan.id, "updated", actor=data.updated_by, details={"version": plan.version})
    return plan


@router.get("/projects/{slug}/plan/versions", response_model=list[PlanVersionResponse])
async def get_plan_versions(slug: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(select(Plan).where(Plan.project_id == project.id))
    plan = result.scalar_one_or_none()
    if not plan:
        return []
    versions_result = await db.execute(
        select(PlanVersion).where(PlanVersion.plan_id == plan.id).order_by(PlanVersion.version.desc())
    )
    return versions_result.scalars().all()
