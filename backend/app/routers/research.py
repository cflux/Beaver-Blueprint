from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import ResearchItem
from ..schemas.research import ResearchItemCreate, ResearchItemUpdate, ResearchItemResponse, TagRename
from ..services.activity import log_activity
from .projects import get_project_by_slug

router = APIRouter(tags=["research"])


@router.get("/projects/{slug}/research/tags", response_model=list[str])
async def list_research_tags(slug: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(ResearchItem.tag)
        .where(ResearchItem.project_id == project.id, ResearchItem.tag != "")
        .distinct()
        .order_by(ResearchItem.tag)
    )
    return result.scalars().all()


@router.put("/projects/{slug}/research/tags/{tag}")
async def rename_tag(slug: str, tag: str, data: TagRename, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(ResearchItem).where(ResearchItem.project_id == project.id, ResearchItem.tag == tag)
    )
    items = result.scalars().all()
    for item in items:
        item.tag = data.name
    await db.flush()
    await log_activity(db, project.id, "research", 0, "tag_renamed", actor="human", details={"from": tag, "to": data.name, "count": len(items)})
    return {"renamed": len(items), "from": tag, "to": data.name}


@router.delete("/projects/{slug}/research/tags/{tag}", status_code=204)
async def delete_tag(slug: str, tag: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(ResearchItem).where(ResearchItem.project_id == project.id, ResearchItem.tag == tag)
    )
    items = result.scalars().all()
    for item in items:
        item.tag = ""
    await db.flush()
    await log_activity(db, project.id, "research", 0, "tag_deleted", actor="human", details={"tag": tag, "count": len(items)})


@router.get("/projects/{slug}/research", response_model=list[ResearchItemResponse])
async def list_research(slug: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(ResearchItem)
        .where(ResearchItem.project_id == project.id)
        .order_by(ResearchItem.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{slug}/research", response_model=ResearchItemResponse, status_code=201)
async def create_research(slug: str, data: ResearchItemCreate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    item = ResearchItem(
        project_id=project.id,
        title=data.title,
        url=data.url,
        notes=data.notes,
        tag=data.tag,
        created_by=data.created_by,
    )
    db.add(item)
    await db.flush()
    await log_activity(db, project.id, "research", item.id, "created", actor=data.created_by, details={"title": data.title})
    return item


@router.put("/projects/{slug}/research/{item_id}", response_model=ResearchItemResponse)
async def update_research(slug: str, item_id: int, data: ResearchItemUpdate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(ResearchItem).where(ResearchItem.project_id == project.id, ResearchItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Research item not found")

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(item, key, value)

    await db.flush()
    await log_activity(db, project.id, "research", item.id, "updated", actor="human", details=updates)
    return item


@router.delete("/projects/{slug}/research/{item_id}", status_code=204)
async def delete_research(slug: str, item_id: int, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(ResearchItem).where(ResearchItem.project_id == project.id, ResearchItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Research item not found")
    await db.delete(item)
