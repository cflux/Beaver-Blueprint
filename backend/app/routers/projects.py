from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from slugify import slugify

from ..database import get_db
from ..models import Project, Issue, Milestone, ProgressEntry, ActivityLog
from ..schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectStats,
    DashboardResponse,
)
from ..schemas.activity import ActivityResponse
from ..services.activity import log_activity

router = APIRouter(prefix="/projects", tags=["projects"])


async def get_project_by_slug(slug: str, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.slug == slug))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=ProjectListResponse)
async def list_projects(status: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Project).order_by(Project.updated_at.desc())
    if status:
        query = query.where(Project.status == status)
    result = await db.execute(query)
    projects = result.scalars().all()
    return ProjectListResponse(projects=projects, total=len(projects))


@router.get("/categories", response_model=list[str])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project.category).distinct().order_by(Project.category)
    )
    return result.scalars().all()


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    slug = slugify(data.name)

    # Check for slug collision
    existing = await db.execute(select(Project).where(Project.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A project with this name already exists")

    project = Project(name=data.name, slug=slug, description=data.description, category=data.category, status=data.status)
    db.add(project)
    await db.flush()

    await log_activity(db, project.id, "project", project.id, "created", details={"name": data.name})
    return project


@router.get("/{slug}", response_model=ProjectResponse)
async def get_project(slug: str, db: AsyncSession = Depends(get_db)):
    return await get_project_by_slug(slug, db)


@router.put("/{slug}", response_model=ProjectResponse)
async def update_project(slug: str, data: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    updates = data.model_dump(exclude_unset=True)

    if "name" in updates and updates["name"]:
        new_slug = slugify(updates["name"])
        if new_slug != project.slug:
            existing = await db.execute(select(Project).where(Project.slug == new_slug))
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="A project with this name already exists")
            project.slug = new_slug
        project.name = updates["name"]

    if "description" in updates:
        project.description = updates["description"]
    if "category" in updates:
        project.category = updates["category"]
    if "status" in updates:
        project.status = updates["status"]
    if "goal" in updates:
        project.goal = updates["goal"]

    await log_activity(db, project.id, "project", project.id, "updated", details=updates)
    await db.flush()
    await db.refresh(project)
    return project


@router.delete("/{slug}", status_code=204)
async def delete_project(slug: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    await db.delete(project)


@router.get("/{slug}/stats", response_model=ProjectStats)
async def get_project_stats(slug: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)

    open_issues = await db.execute(
        select(sa_func.count()).select_from(Issue).where(Issue.project_id == project.id, Issue.status != "closed")
    )
    closed_issues = await db.execute(
        select(sa_func.count()).select_from(Issue).where(Issue.project_id == project.id, Issue.status == "closed")
    )

    # Latest progress entry
    latest_progress = await db.execute(
        select(ProgressEntry.percentage)
        .where(ProgressEntry.project_id == project.id)
        .order_by(ProgressEntry.created_at.desc())
        .limit(1)
    )

    milestones_total = await db.execute(
        select(sa_func.count()).select_from(Milestone).where(Milestone.project_id == project.id)
    )
    milestones_completed = await db.execute(
        select(sa_func.count())
        .select_from(Milestone)
        .where(Milestone.project_id == project.id, Milestone.status == "completed")
    )

    progress_val = latest_progress.scalar() or 0

    return ProjectStats(
        open_issues=open_issues.scalar() or 0,
        closed_issues=closed_issues.scalar() or 0,
        progress=progress_val,
        milestones_total=milestones_total.scalar() or 0,
        milestones_completed=milestones_completed.scalar() or 0,
    )
