# Beaver Blueprint — Backend

FastAPI backend with SQLite (WAL mode) and SQLAlchemy.

## Setup

```bash
cd backend
uv venv
uv pip install -e ".[dev]"
```

## Run dev server

```bash
uvicorn app.main:app --reload --port 8000
```

API available at `http://localhost:8000`. Docs at `/docs`.

## Database

SQLite database is auto-created at `data/beaver.db` on first startup. Tables are created automatically via SQLAlchemy.

### Migrations (Alembic)

```bash
# Generate a migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## Project Structure

```
backend/
├── app/
│   ├── main.py         # FastAPI app, CORS, lifespan
│   ├── config.py       # Settings (env vars with BB_ prefix)
│   ├── database.py     # SQLite engine, WAL mode, session
│   ├── models/         # SQLAlchemy ORM models
│   ├── schemas/        # Pydantic request/response schemas
│   ├── routers/        # API route handlers
│   └── services/       # Business logic (activity logging)
├── alembic/            # Database migrations
├── data/               # SQLite database (gitignored)
└── pyproject.toml
```

## API Endpoints

### Projects
- `GET /api/v1/projects` — List all projects (optional `?status=` filter)
- `POST /api/v1/projects` — Create a project
- `GET /api/v1/projects/{slug}` — Get project by slug
- `PUT /api/v1/projects/{slug}` — Update project
- `DELETE /api/v1/projects/{slug}` — Delete project
- `GET /api/v1/projects/{slug}/stats` — Project statistics

### Activity
- `GET /api/v1/activity` — Global activity feed
- `GET /api/v1/projects/{slug}/activity` — Project activity feed

### Dashboard
- `GET /api/v1/dashboard` — Aggregated dashboard data
