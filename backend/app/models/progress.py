from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from ..database import Base


class ProgressEntry(Base):
    __tablename__ = "progress_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    milestone_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("milestones.id", ondelete="SET NULL"), default=None)
    note: Mapped[str] = mapped_column(Text)
    percentage: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    created_by: Mapped[str] = mapped_column(String(50), default="human")

    project: Mapped["Project"] = relationship("Project", back_populates="progress_entries")
    milestone: Mapped["Milestone | None"] = relationship("Milestone", back_populates="progress_entries")


from .project import Project  # noqa: E402
from .milestone import Milestone  # noqa: E402
