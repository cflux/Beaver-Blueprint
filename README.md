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
                    │   FastMCP    │  (direct DB access)
                    └──────────────┘
```

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Python FastAPI + SQLAlchemy + SQLite
- **MCP Server**: FastMCP — direct SQLite access for Claude Code

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

### MCP Server (for Claude Code)

```bash
cd mcp-server
python -m venv .venv
.venv/Scripts/pip install fastmcp sqlalchemy python-slugify

# Test with inspector
fastmcp dev server.py
```

Add to Claude Code config:
```json
{
  "mcpServers": {
    "beaver-blueprint": {
      "command": "python",
      "args": ["<path-to>/mcp-server/server.py"]
    }
  }
}
```

## Docker Deployment

```bash
docker compose up --build
```

Frontend at http://localhost, API at http://localhost:8000.

## Features

- **Dashboard** — Project cards, global activity feed, summary stats
- **Project Overview** — Stats, progress bar, activity timeline
- **Plan Editor** — Markdown editor with live preview and version history
- **Issue Tracker** — List view with status/priority filters, create/edit/close issues
- **Documents** — Categorized document management with Markdown editing
- **Progress Tracking** — Completion percentage, timeline, milestone management
- **Dark/Light Mode** — Toggle between themes
- **MCP Integration** — 14 tools for Claude Code to manage projects programmatically

## API Reference

All endpoints under `/api/v1`. Interactive docs at `/docs` when the backend is running.

| Resource | Endpoints |
|----------|-----------|
| Projects | `GET/POST /projects`, `GET/PUT/DELETE /projects/{slug}`, `GET /projects/{slug}/stats` |
| Plans | `GET/PUT /projects/{slug}/plan`, `GET /projects/{slug}/plan/versions` |
| Issues | `GET/POST /projects/{slug}/issues`, `GET/PUT/DELETE /projects/{slug}/issues/{id}` |
| Documents | `GET/POST /projects/{slug}/docs`, `GET/PUT/DELETE /projects/{slug}/docs/{doc_slug}` |
| Milestones | `GET/POST /projects/{slug}/milestones`, `PUT/DELETE /projects/{slug}/milestones/{id}` |
| Progress | `GET/POST /projects/{slug}/progress` |
| Activity | `GET /projects/{slug}/activity`, `GET /activity` |
| Dashboard | `GET /dashboard` |
