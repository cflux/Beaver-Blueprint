"""Beaver Blueprint MCP Server — gives Claude Code direct access to project data."""

from pathlib import Path
from datetime import datetime, timezone
from contextlib import contextmanager

from fastmcp import FastMCP
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Date, JSON, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from slugify import slugify

# Database setup — same SQLite as the web backend
import os
DB_PATH = Path(os.environ.get("BB_DB_PATH", str(Path(__file__).resolve().parent.parent / "backend" / "data" / "beaver.db")))
DB_PATH.parent.mkdir(exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

from sqlalchemy import event as sa_event

@sa_event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# --- Models (mirror of backend) ---

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    name = Column(String(200))
    slug = Column(String(200), unique=True, index=True)
    description = Column(Text)
    status = Column(String(20), default="concept")
    category = Column(String(100))
    goal = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    content = Column(Text, default="")
    version = Column(Integer, default=1)
    updated_at = Column(DateTime, server_default=func.now())
    updated_by = Column(String(50), default="human")


class PlanVersion(Base):
    __tablename__ = "plan_versions"
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    version = Column(Integer)
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(String(50), default="human")


class Issue(Base):
    __tablename__ = "issues"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String(500))
    description = Column(Text)
    status = Column(String(20), default="open")
    priority = Column(String(20), default="medium")
    labels = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    closed_at = Column(DateTime)
    created_by = Column(String(50), default="human")


class Milestone(Base):
    __tablename__ = "milestones"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String(300))
    description = Column(Text)
    due_date = Column(Date)
    status = Column(String(20), default="open")
    created_at = Column(DateTime, server_default=func.now())


class ProgressEntry(Base):
    __tablename__ = "progress_entries"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    milestone_id = Column(Integer, ForeignKey("milestones.id"))
    note = Column(Text)
    percentage = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(String(50), default="human")


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("project_id", "slug"),)
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String(300))
    slug = Column(String(300))
    content = Column(Text, default="")
    category = Column(String(50), default="other")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    updated_by = Column(String(50), default="human")


class ResearchItem(Base):
    __tablename__ = "research_items"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String(500))
    url = Column(String(2000))
    notes = Column(Text, default="")
    tag = Column(String(100), default="")
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(String(50), default="human")


class ActivityLog(Base):
    __tablename__ = "activity_log"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    entity_type = Column(String(50))
    entity_id = Column(Integer)
    action = Column(String(50))
    details = Column(JSON)
    actor = Column(String(50), default="human")
    created_at = Column(DateTime, server_default=func.now())


# Create tables if they don't exist
Base.metadata.create_all(engine)


# --- Helpers ---

@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def log_activity(db: Session, project_id: int, entity_type: str, entity_id: int, action: str, actor: str = "claude", details: dict = None):
    entry = ActivityLog(
        project_id=project_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        details=details,
        actor=actor,
    )
    db.add(entry)
    db.flush()


def get_project(db: Session, slug: str) -> Project:
    project = db.query(Project).filter(Project.slug == slug).first()
    if not project:
        raise ValueError(f"Project '{slug}' not found")
    return project


# --- MCP Server ---

mcp = FastMCP("Beaver Blueprint", instructions="Project management tools for tracking projects, plans, issues, documents, and progress.")


@mcp.tool()
def list_projects(status: str = None) -> str:
    """List all projects. Optionally filter by status (concept/active/in_progress/complete)."""
    with get_db() as db:
        query = db.query(Project).order_by(Project.updated_at.desc())
        if status:
            query = query.filter(Project.status == status)
        projects = query.all()

        if not projects:
            return "No projects found."

        lines = [f"# Projects ({len(projects)} total)\n"]
        for p in projects:
            lines.append(f"- **{p.name}** (`{p.slug}`) — {p.status} [{p.category}]")
            if p.description:
                lines.append(f"  {p.description[:100]}")
        return "\n".join(lines)


@mcp.tool()
def get_project_detail(slug: str) -> str:
    """Get detailed information about a project including stats."""
    with get_db() as db:
        project = get_project(db, slug)
        open_issues = db.query(Issue).filter(Issue.project_id == project.id, Issue.status != "closed").count()
        closed_issues = db.query(Issue).filter(Issue.project_id == project.id, Issue.status == "closed").count()
        milestones = db.query(Milestone).filter(Milestone.project_id == project.id).count()
        ms_completed = db.query(Milestone).filter(Milestone.project_id == project.id, Milestone.status == "completed").count()

        latest = db.query(ProgressEntry).filter(ProgressEntry.project_id == project.id).order_by(ProgressEntry.created_at.desc()).first()
        progress = latest.percentage if latest else 0

        return f"""# {project.name}
**Status:** {project.status}
**Category:** {project.category}
**Description:** {project.description or 'None'}
**Goal:** {project.goal or 'None'}
**Progress:** {progress}%
**Issues:** {open_issues} open, {closed_issues} closed
**Milestones:** {ms_completed}/{milestones} completed
**Created:** {project.created_at}
**Updated:** {project.updated_at}"""


@mcp.tool()
def create_project(name: str, category: str, description: str = "") -> str:
    """Create a new project with a category."""
    with get_db() as db:
        slug = slugify(name)
        existing = db.query(Project).filter(Project.slug == slug).first()
        if existing:
            return f"Error: A project with slug '{slug}' already exists."

        project = Project(name=name, slug=slug, description=description, category=category)
        db.add(project)
        db.flush()
        log_activity(db, project.id, "project", project.id, "created", details={"name": name})
        return f"Created project **{name}** (`{slug}`) in category '{category}'"


@mcp.tool()
def update_project(slug: str, name: str = None, description: str = None, category: str = None, goal: str = None) -> str:
    """Update a project's name, description, category, or goal."""
    with get_db() as db:
        project = get_project(db, slug)
        updates = {}
        if name is not None:
            project.name = name
            updates["name"] = name
        if description is not None:
            project.description = description
            updates["description"] = "updated"
        if category is not None:
            project.category = category
            updates["category"] = category
        if goal is not None:
            project.goal = goal
            updates["goal"] = "updated"
        if not updates:
            return "No updates provided."
        project.updated_at = datetime.now(timezone.utc)
        log_activity(db, project.id, "project", project.id, "updated", details=updates)
        return f"Updated project **{project.name}**: {', '.join(updates.keys())}"


@mcp.tool()
def update_project_status(slug: str, status: str) -> str:
    """Update a project's status. Valid statuses: concept, active, in_progress, complete, retired."""
    valid = {"concept", "active", "in_progress", "complete", "retired"}
    if status not in valid:
        return f"Error: Invalid status '{status}'. Must be one of: {', '.join(sorted(valid))}"
    with get_db() as db:
        project = get_project(db, slug)
        old_status = project.status
        project.status = status
        project.updated_at = datetime.now(timezone.utc)
        log_activity(db, project.id, "project", project.id, "updated", details={"status": status, "old_status": old_status})
        return f"Updated **{project.name}** status: {old_status} → {status}"


@mcp.tool()
def get_project_status(slug: str) -> str:
    """Get the current status of a project."""
    with get_db() as db:
        project = get_project(db, slug)
        return f"**{project.name}** — Status: {project.status}"


@mcp.tool()
def get_plan(slug: str) -> str:
    """Get the current plan for a project."""
    with get_db() as db:
        project = get_project(db, slug)
        plan = db.query(Plan).filter(Plan.project_id == project.id).first()
        if not plan or not plan.content:
            return f"No plan exists for project '{slug}' yet."
        return f"# Plan for {project.name} (v{plan.version})\n\n{plan.content}"


@mcp.tool()
def update_plan(slug: str, content: str) -> str:
    """Update the plan for a project. Content should be Markdown."""
    with get_db() as db:
        project = get_project(db, slug)
        plan = db.query(Plan).filter(Plan.project_id == project.id).first()

        if not plan:
            plan = Plan(project_id=project.id, content=content, version=1, updated_by="claude")
            db.add(plan)
            db.flush()
        else:
            # Snapshot
            snapshot = PlanVersion(plan_id=plan.id, version=plan.version, content=plan.content, created_by=plan.updated_by)
            db.add(snapshot)
            plan.content = content
            plan.version += 1
            plan.updated_by = "claude"
            plan.updated_at = datetime.now(timezone.utc)

        db.flush()
        log_activity(db, project.id, "plan", plan.id, "updated", details={"version": plan.version})
        return f"Updated plan for **{project.name}** to v{plan.version}"


@mcp.tool()
def list_issues(slug: str, status: str = None, priority: str = None) -> str:
    """List issues for a project. Optionally filter by status (open/in_progress/closed) and/or priority (low/medium/high/critical)."""
    with get_db() as db:
        project = get_project(db, slug)
        query = db.query(Issue).filter(Issue.project_id == project.id).order_by(Issue.created_at.desc())
        if status:
            query = query.filter(Issue.status == status)
        if priority:
            query = query.filter(Issue.priority == priority)
        issues = query.all()

        if not issues:
            return f"No issues found for project '{slug}'."

        lines = [f"# Issues for {project.name} ({len(issues)})\n"]
        for i in issues:
            labels = ", ".join(i.labels) if i.labels else ""
            lines.append(f"- **#{i.id}** [{i.priority}] {i.title} — {i.status}{f' ({labels})' if labels else ''}")
        return "\n".join(lines)


@mcp.tool()
def create_issue(slug: str, title: str, description: str = "", priority: str = "medium", labels: list[str] = None) -> str:
    """Create a new issue in a project."""
    with get_db() as db:
        project = get_project(db, slug)
        issue = Issue(
            project_id=project.id,
            title=title,
            description=description,
            priority=priority,
            labels=labels or [],
            created_by="claude",
        )
        db.add(issue)
        db.flush()
        log_activity(db, project.id, "issue", issue.id, "created", details={"title": title})
        return f"Created issue **#{issue.id}**: {title}"


@mcp.tool()
def update_issue(slug: str, issue_id: int, status: str = None, priority: str = None, title: str = None, description: str = None, labels: list[str] = None) -> str:
    """Update an existing issue."""
    with get_db() as db:
        project = get_project(db, slug)
        issue = db.query(Issue).filter(Issue.id == issue_id, Issue.project_id == project.id).first()
        if not issue:
            return f"Error: Issue #{issue_id} not found in project '{slug}'."

        updates = {}
        if status is not None:
            issue.status = status
            updates["status"] = status
            if status == "closed" and not issue.closed_at:
                issue.closed_at = datetime.now(timezone.utc)
            elif status != "closed":
                issue.closed_at = None
        if priority is not None:
            issue.priority = priority
            updates["priority"] = priority
        if title is not None:
            issue.title = title
            updates["title"] = title
        if description is not None:
            issue.description = description
            updates["description"] = "updated"
        if labels is not None:
            issue.labels = labels
            updates["labels"] = labels

        issue.updated_at = datetime.now(timezone.utc)
        log_activity(db, project.id, "issue", issue.id, "updated", details=updates)
        return f"Updated issue **#{issue.id}**: {issue.title} — {issue.status}"


@mcp.tool()
def delete_issue(slug: str, issue_id: int) -> str:
    """Delete an issue permanently."""
    with get_db() as db:
        project = get_project(db, slug)
        issue = db.query(Issue).filter(Issue.id == issue_id, Issue.project_id == project.id).first()
        if not issue:
            return f"Error: Issue #{issue_id} not found in project '{slug}'."
        title = issue.title
        db.delete(issue)
        db.flush()
        log_activity(db, project.id, "issue", issue_id, "deleted", details={"title": title})
        return f"Deleted issue **#{issue_id}**: {title}"


@mcp.tool()
def log_progress(slug: str, percentage: int, note: str, milestone_id: int = None) -> str:
    """Log a progress entry for a project (0-100%)."""
    with get_db() as db:
        project = get_project(db, slug)
        entry = ProgressEntry(
            project_id=project.id,
            milestone_id=milestone_id,
            note=note,
            percentage=percentage,
            created_by="claude",
        )
        db.add(entry)
        db.flush()
        log_activity(db, project.id, "progress", entry.id, "logged", details={"percentage": percentage, "note": note})
        return f"Logged progress for **{project.name}**: {percentage}% — {note}"


@mcp.tool()
def get_activity(slug: str = None, limit: int = 20) -> str:
    """Get recent activity. Optionally filter by project slug."""
    with get_db() as db:
        query = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)
        if slug:
            project = get_project(db, slug)
            query = query.filter(ActivityLog.project_id == project.id)
        entries = query.all()

        if not entries:
            return "No recent activity."

        lines = ["# Recent Activity\n"]
        for a in entries:
            detail_str = ""
            if a.details:
                detail_str = " — " + ", ".join(f"{k}: {v}" for k, v in a.details.items() if k != "description")
            lines.append(f"- [{a.actor}] {a.action} {a.entity_type} #{a.entity_id}{detail_str}")
        return "\n".join(lines)


@mcp.tool()
def list_docs(slug: str) -> str:
    """List all documents for a project."""
    with get_db() as db:
        project = get_project(db, slug)
        docs = db.query(Document).filter(Document.project_id == project.id).order_by(Document.sort_order, Document.title).all()

        if not docs:
            return f"No documents found for project '{slug}'."

        lines = [f"# Documents for {project.name} ({len(docs)})\n"]
        by_cat = {}
        for d in docs:
            by_cat.setdefault(d.category, []).append(d)
        for cat, cat_docs in by_cat.items():
            lines.append(f"\n## {cat.title()}")
            for d in cat_docs:
                lines.append(f"- **{d.title}** (`{d.slug}`) — updated by {d.updated_by}")
        return "\n".join(lines)


@mcp.tool()
def get_doc(slug: str, doc_slug: str) -> str:
    """Get a document's content by project slug and document slug."""
    with get_db() as db:
        project = get_project(db, slug)
        doc = db.query(Document).filter(Document.project_id == project.id, Document.slug == doc_slug).first()
        if not doc:
            return f"Error: Document '{doc_slug}' not found in project '{slug}'."
        return f"# {doc.title}\n**Category:** {doc.category}\n\n{doc.content}"


@mcp.tool()
def create_doc(slug: str, title: str, content: str = "", category: str = "other") -> str:
    """Create a new document in a project."""
    with get_db() as db:
        project = get_project(db, slug)
        doc_slug = slugify(title)
        existing = db.query(Document).filter(Document.project_id == project.id, Document.slug == doc_slug).first()
        if existing:
            return f"Error: Document '{doc_slug}' already exists in project '{slug}'."

        doc = Document(
            project_id=project.id,
            title=title,
            slug=doc_slug,
            content=content,
            category=category,
            updated_by="claude",
        )
        db.add(doc)
        db.flush()
        log_activity(db, project.id, "document", doc.id, "created", details={"title": title})
        return f"Created document **{title}** (`{doc_slug}`) in project '{slug}'"


@mcp.tool()
def update_doc(slug: str, doc_slug: str, content: str = None, title: str = None) -> str:
    """Update a document's content or title."""
    with get_db() as db:
        project = get_project(db, slug)
        doc = db.query(Document).filter(Document.project_id == project.id, Document.slug == doc_slug).first()
        if not doc:
            return f"Error: Document '{doc_slug}' not found in project '{slug}'."

        updates = {}
        if content is not None:
            doc.content = content
            updates["content"] = "updated"
        if title is not None:
            doc.title = title
            new_slug = slugify(title)
            if new_slug != doc.slug:
                doc.slug = new_slug
            updates["title"] = title

        doc.updated_by = "claude"
        doc.updated_at = datetime.now(timezone.utc)
        log_activity(db, project.id, "document", doc.id, "updated", details=updates)
        return f"Updated document **{doc.title}** in project '{slug}'"


@mcp.tool()
def delete_doc(slug: str, doc_slug: str) -> str:
    """Delete a document permanently."""
    with get_db() as db:
        project = get_project(db, slug)
        doc = db.query(Document).filter(Document.project_id == project.id, Document.slug == doc_slug).first()
        if not doc:
            return f"Error: Document '{doc_slug}' not found in project '{slug}'."
        title = doc.title
        db.delete(doc)
        db.flush()
        log_activity(db, project.id, "document", doc.id, "deleted", details={"title": title})
        return f"Deleted document **{title}** from project '{slug}'"


@mcp.tool()
def get_plan_versions(slug: str) -> str:
    """Get the version history of a project's plan."""
    with get_db() as db:
        project = get_project(db, slug)
        plan = db.query(Plan).filter(Plan.project_id == project.id).first()
        if not plan:
            return f"No plan exists for project '{slug}'."
        versions = db.query(PlanVersion).filter(PlanVersion.plan_id == plan.id).order_by(PlanVersion.version.desc()).all()
        if not versions:
            return f"No previous versions for **{project.name}** plan (currently v{plan.version})."
        lines = [f"# Plan Version History for {project.name}\n", f"**Current:** v{plan.version} (by {plan.updated_by})\n"]
        for v in versions:
            lines.append(f"- **v{v.version}** — {v.created_at} by {v.created_by}")
        return "\n".join(lines)


@mcp.tool()
def list_research(slug: str) -> str:
    """List all research items for a project's Discovery section."""
    with get_db() as db:
        project = get_project(db, slug)
        items = db.query(ResearchItem).filter(ResearchItem.project_id == project.id).order_by(ResearchItem.tag, ResearchItem.created_at).all()
        if not items:
            return f"No research items found for project '{slug}'."
        lines = [f"# Research for {project.name} ({len(items)} items)\n"]
        current_tag = None
        for item in items:
            tag = item.tag or "Untagged"
            if tag != current_tag:
                current_tag = tag
                lines.append(f"\n## {tag}")
            url_str = f" — {item.url}" if item.url else ""
            lines.append(f"- **[{item.id}] {item.title}**{url_str}")
            if item.notes:
                lines.append(f"  {item.notes[:200]}")
        return "\n".join(lines)


@mcp.tool()
def get_research_item(slug: str, item_id: int) -> str:
    """Get the full details of a single research item, including complete notes."""
    with get_db() as db:
        project = get_project(db, slug)
        item = db.query(ResearchItem).filter(ResearchItem.id == item_id, ResearchItem.project_id == project.id).first()
        if not item:
            return f"Error: Research item #{item_id} not found in project '{slug}'."
        return f"""# [{item.id}] {item.title}
**Tag:** {item.tag or 'Untagged'}
**URL:** {item.url or 'None'}
**Created by:** {item.created_by} on {item.created_at}

## Notes
{item.notes or '*(no notes)*'}"""


@mcp.tool()
def create_research_item(slug: str, title: str, url: str = "", notes: str = "", tag: str = "") -> str:
    """Create a new research item in a project's Discovery section."""
    with get_db() as db:
        project = get_project(db, slug)
        item = ResearchItem(
            project_id=project.id,
            title=title,
            url=url,
            notes=notes,
            tag=tag,
            created_by="claude",
        )
        db.add(item)
        db.flush()
        log_activity(db, project.id, "research", item.id, "created", details={"title": title, "tag": tag})
        return f"Created research item **#{item.id}**: {title}" + (f" [{tag}]" if tag else "")


@mcp.tool()
def update_research_item(slug: str, item_id: int, title: str = None, url: str = None, notes: str = None, tag: str = None) -> str:
    """Update a research item in a project's Discovery section."""
    with get_db() as db:
        project = get_project(db, slug)
        item = db.query(ResearchItem).filter(ResearchItem.id == item_id, ResearchItem.project_id == project.id).first()
        if not item:
            return f"Error: Research item #{item_id} not found in project '{slug}'."
        updates = {}
        if title is not None:
            item.title = title
            updates["title"] = title
        if url is not None:
            item.url = url
            updates["url"] = url
        if notes is not None:
            item.notes = notes
            updates["notes"] = "updated"
        if tag is not None:
            item.tag = tag
            updates["tag"] = tag
        if not updates:
            return "No updates provided."
        log_activity(db, project.id, "research", item.id, "updated", details=updates)
        return f"Updated research item **#{item.id}**: {item.title}"


@mcp.tool()
def delete_research_item(slug: str, item_id: int) -> str:
    """Delete a research item from a project's Discovery section."""
    with get_db() as db:
        project = get_project(db, slug)
        item = db.query(ResearchItem).filter(ResearchItem.id == item_id, ResearchItem.project_id == project.id).first()
        if not item:
            return f"Error: Research item #{item_id} not found in project '{slug}'."
        title = item.title
        db.delete(item)
        db.flush()
        log_activity(db, project.id, "research", item_id, "deleted", details={"title": title})
        return f"Deleted research item **#{item_id}**: {title}"


@mcp.tool()
def list_milestones(slug: str) -> str:
    """List all milestones for a project."""
    with get_db() as db:
        project = get_project(db, slug)
        milestones = db.query(Milestone).filter(Milestone.project_id == project.id).order_by(Milestone.due_date, Milestone.created_at).all()
        if not milestones:
            return f"No milestones found for project '{slug}'."
        lines = [f"# Milestones for {project.name} ({len(milestones)})\n"]
        for m in milestones:
            due = f" — due {m.due_date}" if m.due_date else ""
            status_icon = "✓" if m.status == "completed" else "○"
            lines.append(f"- {status_icon} **[{m.id}] {m.title}**{due} [{m.status}]")
            if m.description:
                lines.append(f"  {m.description[:150]}")
        return "\n".join(lines)


@mcp.tool()
def create_milestone(slug: str, title: str, description: str = "", due_date: str = None) -> str:
    """Create a new milestone for a project. due_date format: YYYY-MM-DD."""
    with get_db() as db:
        project = get_project(db, slug)
        due = None
        if due_date:
            from datetime import date
            due = date.fromisoformat(due_date)
        milestone = Milestone(
            project_id=project.id,
            title=title,
            description=description,
            due_date=due,
        )
        db.add(milestone)
        db.flush()
        log_activity(db, project.id, "milestone", milestone.id, "created", details={"title": title})
        return f"Created milestone **#{milestone.id}**: {title}" + (f" (due {due_date})" if due_date else "")


@mcp.tool()
def update_milestone(slug: str, milestone_id: int, title: str = None, description: str = None, due_date: str = None, status: str = None) -> str:
    """Update a milestone. status values: open, completed. due_date format: YYYY-MM-DD."""
    with get_db() as db:
        project = get_project(db, slug)
        milestone = db.query(Milestone).filter(Milestone.id == milestone_id, Milestone.project_id == project.id).first()
        if not milestone:
            return f"Error: Milestone #{milestone_id} not found in project '{slug}'."
        updates = {}
        if title is not None:
            milestone.title = title
            updates["title"] = title
        if description is not None:
            milestone.description = description
            updates["description"] = "updated"
        if due_date is not None:
            from datetime import date
            milestone.due_date = date.fromisoformat(due_date)
            updates["due_date"] = due_date
        if status is not None:
            valid = {"open", "completed"}
            if status not in valid:
                return f"Error: Invalid status '{status}'. Must be one of: {', '.join(sorted(valid))}"
            milestone.status = status
            updates["status"] = status
        if not updates:
            return "No updates provided."
        log_activity(db, project.id, "milestone", milestone.id, "updated", details=updates)
        return f"Updated milestone **#{milestone.id}**: {milestone.title} — {milestone.status}"


if __name__ == "__main__":
    import os
    host = os.environ.get("MCP_HOST", "0.0.0.0")
    port = int(os.environ.get("MCP_PORT", "8001"))
    mcp.run(transport="sse", host=host, port=port)
