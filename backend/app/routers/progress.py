from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import ProgressEntry
from ..schemas.progress import ProgressCreate, ProgressResponse
from ..services.activity import log_activity
from .projects import get_project_by_slug

router = APIRouter(tags=["progress"])


@router.get("/projects/{slug}/progress", response_model=list[ProgressResponse])
async def list_progress(slug: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(ProgressEntry)
        .where(ProgressEntry.project_id == project.id)
        .order_by(ProgressEntry.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{slug}/progress", response_model=ProgressResponse, status_code=201)
async def log_progress_entry(slug: str, data: ProgressCreate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    entry = ProgressEntry(
        project_id=project.id,
        milestone_id=data.milestone_id,
        note=data.note,
        percentage=data.percentage,
        created_by=data.created_by,
    )
    db.add(entry)
    await db.flush()
    await log_activity(
        db, project.id, "progress", entry.id, "logged",
        actor=data.created_by,
        details={"percentage": data.percentage, "note": data.note},
    )
    return entry
