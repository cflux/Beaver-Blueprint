from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import engine, Base
from .routers import projects, activity, dashboard, plans, issues, documents, milestones, progress, images, research


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api/v1")
app.include_router(activity.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(plans.router, prefix="/api/v1")
app.include_router(issues.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(milestones.router, prefix="/api/v1")
app.include_router(progress.router, prefix="/api/v1")
app.include_router(images.router, prefix="/api/v1")
app.include_router(research.router, prefix="/api/v1")

_uploads_dir = Path(__file__).resolve().parent.parent / "data" / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
