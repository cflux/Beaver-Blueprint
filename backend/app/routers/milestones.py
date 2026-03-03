from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Milestone
from ..schemas.milestone import MilestoneCreate, MilestoneUpdate, MilestoneResponse
from ..services.activity import log_activity
from .projects import get_project_by_slug

router = APIRouter(tags=["milestones"])


@router.get("/projects/{slug}/milestones", response_model=list[MilestoneResponse])
async def list_milestones(slug: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(Milestone).where(Milestone.project_id == project.id).order_by(Milestone.due_date.asc().nulls_last(), Milestone.created_at)
    )
    return result.scalars().all()


@router.post("/projects/{slug}/milestones", response_model=MilestoneResponse, status_code=201)
async def create_milestone(slug: str, data: MilestoneCreate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    milestone = Milestone(
        project_id=project.id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
    )
    db.add(milestone)
    await db.flush()
    await log_activity(db, project.id, "milestone", milestone.id, "created", details={"title": data.title})
    return milestone


@router.put("/projects/{slug}/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(slug: str, milestone_id: int, data: MilestoneUpdate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(Milestone).where(Milestone.id == milestone_id, Milestone.project_id == project.id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(milestone, key, value)

    await db.flush()
    await log_activity(db, project.id, "milestone", milestone.id, "updated", details=updates)
    return milestone


@router.delete("/projects/{slug}/milestones/{milestone_id}", status_code=204)
async def delete_milestone(slug: str, milestone_id: int, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(Milestone).where(Milestone.id == milestone_id, Milestone.project_id == project.id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    await db.delete(milestone)
