from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from ..database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[str] = mapped_column(String(20), default="concept")
    category: Mapped[str] = mapped_column(String(100))
    goal: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    plan: Mapped["Plan | None"] = relationship("Plan", back_populates="project", uselist=False, passive_deletes=True)
    issues: Mapped[list["Issue"]] = relationship("Issue", back_populates="project", passive_deletes=True)
    milestones: Mapped[list["Milestone"]] = relationship("Milestone", back_populates="project", passive_deletes=True)
    progress_entries: Mapped[list["ProgressEntry"]] = relationship("ProgressEntry", back_populates="project", passive_deletes=True)
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="project", passive_deletes=True)
    activities: Mapped[list["ActivityLog"]] = relationship("ActivityLog", back_populates="project", passive_deletes=True)
    research_items: Mapped[list["ResearchItem"]] = relationship("ResearchItem", back_populates="project", passive_deletes=True)


from .plan import Plan  # noqa: E402
from .issue import Issue  # noqa: E402
from .milestone import Milestone  # noqa: E402
from .progress import ProgressEntry  # noqa: E402
from .document import Document  # noqa: E402
from .activity import ActivityLog  # noqa: E402
from .research import ResearchItem  # noqa: E402
