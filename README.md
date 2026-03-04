# Beaver Blueprint

A web-based project management tool for tracking projects managed with Claude Code. Provides a human-friendly web UI for viewing/editing plans, tracking issues, managing documents, and monitoring progress — plus an MCP server so Claude Code can read and update everything programmatically.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Frontend   │────▶│   Backend    │────▶│   SQLite   │
│  React/Vite  │     │   FastAPI    │     │  (WAL mode)│
└─────────────┘     └──────────────┘     └────────────┘
                                               ▲
                    ┌──────────────┐            │
                    │  MCP Server  │────────────┘
                    │   FastMCP    │  (direct DB access, SSE transport)
                    └──────────────┘
                           ▲
                           │ HTTP SSE
                    ┌──────────────┐
                    │  Claude Code │
                    │ (your machine│
                    └──────────────┘
```

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Python FastAPI + SQLAlchemy + SQLite
- **MCP Server**: FastMCP — direct SQLite access, exposed over SSE for remote Claude Code connections

## Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -e ".[dev]"   # Windows
# or: .venv/bin/pip install -e ".[dev]"  # Linux/Mac

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### MCP Server

See [mcp-server/README.md](mcp-server/README.md) for full setup and Claude Code configuration instructions.

## Docker Deployment

All three services start together:

```bash
docker compose up --build
```

| Service | Default URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| MCP Server (SSE) | http://localhost:8001/sse |

Ports are configurable via a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
# edit .env, then:
docker compose up -d
```

```ini
FRONTEND_PORT=80
BACKEND_PORT=8000
MCP_PORT=8001
BB_CORS_ORIGINS=["http://localhost"]
```

To connect Claude Code on another machine, edit `.claude/settings.json`:

```json
{
  "mcpServers": {
    "beaver-blueprint": {
      "url": "http://YOUR-SERVER-IP:8001/sse"
    }
  }
}
```

## Features

- **Dashboard** — Project cards, global activity feed, summary stats
- **Project Overview** — Stats, progress bar, activity timeline
- **Plan Editor** — Markdown editor with live preview and version history
- **Issue Tracker** — List view with status/priority filters, create/edit/close issues
- **Documents** — Categorized document management with Markdown editing
- **Progress Tracking** — Completion percentage, timeline, milestone management
- **Discovery** — Research item tracking with tags and notes
- **Retired Projects** — Archive projects out of the sidebar; restore them at any time
- **Dark/Light Mode** — Toggle between themes
- **MCP Integration** — 27 tools for Claude Code to manage projects programmatically

## Project Statuses

| Status | Description |
|---|---|
| `concept` | Early idea, not yet started |
| `active` | Actively being worked on |
| `in_progress` | In a specific phase of development |
| `complete` | Finished |
| `retired` | Archived — hidden from sidebar, restorable at any time |

## API Reference

All endpoints under `/api/v1`. Interactive docs at `http://localhost:8000/docs` when the backend is running.

| Resource | Endpoints |
|---|---|
| Projects | `GET/POST /projects`, `GET/PUT/DELETE /projects/{slug}`, `GET /projects/{slug}/stats` |
| Plans | `GET/PUT /projects/{slug}/plan`, `GET /projects/{slug}/plan/versions` |
| Issues | `GET/POST /projects/{slug}/issues`, `GET/PUT/DELETE /projects/{slug}/issues/{id}` |
| Documents | `GET/POST /projects/{slug}/docs`, `GET/PUT/DELETE /projects/{slug}/docs/{doc_slug}` |
| Milestones | `GET/POST /projects/{slug}/milestones`, `PUT/DELETE /projects/{slug}/milestones/{id}` |
| Progress | `GET/POST /projects/{slug}/progress` |
| Research | `GET/POST /projects/{slug}/research`, `GET/PUT/DELETE /projects/{slug}/research/{id}` |
| Activity | `GET /projects/{slug}/activity`, `GET /activity` |
| Dashboard | `GET /dashboard` |
