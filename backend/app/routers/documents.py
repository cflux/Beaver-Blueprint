from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slugify import slugify

from ..database import get_db
from ..models import Document
from ..schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from ..services.activity import log_activity
from .projects import get_project_by_slug

router = APIRouter(tags=["documents"])


@router.get("/projects/{slug}/docs", response_model=list[DocumentResponse])
async def list_documents(slug: str, category: str | None = None, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    query = select(Document).where(Document.project_id == project.id).order_by(Document.sort_order, Document.title)
    if category:
        query = query.where(Document.category == category)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/projects/{slug}/docs", response_model=DocumentResponse, status_code=201)
async def create_document(slug: str, data: DocumentCreate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    doc_slug = slugify(data.title)

    # Check uniqueness within project
    existing = await db.execute(
        select(Document).where(Document.project_id == project.id, Document.slug == doc_slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A document with this title already exists in this project")

    doc = Document(
        project_id=project.id,
        title=data.title,
        slug=doc_slug,
        content=data.content,
        category=data.category,
        sort_order=data.sort_order,
        updated_by=data.updated_by,
    )
    db.add(doc)
    await db.flush()
    await log_activity(db, project.id, "document", doc.id, "created", actor=data.updated_by, details={"title": data.title})
    return doc


@router.get("/projects/{slug}/docs/{doc_slug}", response_model=DocumentResponse)
async def get_document(slug: str, doc_slug: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(Document).where(Document.project_id == project.id, Document.slug == doc_slug)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.put("/projects/{slug}/docs/{doc_slug}", response_model=DocumentResponse)
async def update_document(slug: str, doc_slug: str, data: DocumentUpdate, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(Document).where(Document.project_id == project.id, Document.slug == doc_slug)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    updates = data.model_dump(exclude_unset=True)
    if "title" in updates and updates["title"]:
        new_slug = slugify(updates["title"])
        if new_slug != doc.slug:
            existing = await db.execute(
                select(Document).where(Document.project_id == project.id, Document.slug == new_slug)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="A document with this title already exists")
            doc.slug = new_slug
    for key, value in updates.items():
        setattr(doc, key, value)

    await db.flush()
    await db.refresh(doc)
    await log_activity(db, project.id, "document", doc.id, "updated", actor=data.updated_by, details=updates)
    return doc


@router.delete("/projects/{slug}/docs/{doc_slug}", status_code=204)
async def delete_document(slug: str, doc_slug: str, db: AsyncSession = Depends(get_db)):
    project = await get_project_by_slug(slug, db)
    result = await db.execute(
        select(Document).where(Document.project_id == project.id, Document.slug == doc_slug)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)
