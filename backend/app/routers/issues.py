from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from ..database import get_db
from ..models import Issue
from ..schemas.issue import IssueCreate, IssueUpdate, IssueResponse
from ..services.activity import log_activity
from .projects import get_project_by_slug

router = APIRouter(tags=["issues"])


@router.get("/projects/{slug}/issues", response_model=list[IssueResponse])
async def list_issues(
    slug: str,
    status: str | None = None,
    priority: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_by_slug(slug, db)
    query = select(Issue).where(Issue.project_id == project.id).order_by(Issue.created_at.desc())
    if status:
        query = query.where(Issue.status == status)
    if priority:
        query = query.where(Issue.priority == priority)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/projects/{slug}/issues", response_model=IssueResponse, status_code=201)
async def create_issue(slug: str, data: IssueCreate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    issue = Issue(
        project_id=project.id,
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        labels=data.labels,
        created_by=data.created_by,
    )
    db.add(issue)
    await db.flush()
    await log_activity(db, project.id, "issue", issue.id, "created", actor=data.created_by, details={"title": data.title})
    return issue


@router.get("/projects/{slug}/issues/{issue_id}", response_model=IssueResponse)
async def get_issue(slug: str, issue_id: int, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.project_id == project.id)
    )
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.put("/projects/{slug}/issues/{issue_id}", response_model=IssueResponse)
async def update_issue(slug: str, issue_id: int, data: IssueUpdate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.project_id == project.id)
    )
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(issue, key, value)

    # Auto-set closed_at
    if "status" in updates:
        if updates["status"] == "closed" and not issue.closed_at:
            issue.closed_at = datetime.now(timezone.utc)
        elif updates["status"] != "closed":
            issue.closed_at = None

    await db.flush()
    await db.refresh(issue)
    await log_activity(db, project.id, "issue", issue.id, "updated", details=updates)
    return issue


@router.delete("/projects/{slug}/issues/{issue_id}", status_code=204)
async def delete_issue(slug: str, issue_id: int, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.project_id == project.id)
    )
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    await db.delete(issue)
