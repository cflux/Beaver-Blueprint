# Beaver Blueprint — MCP Server

MCP (Model Context Protocol) server that gives Claude Code direct access to project data.

## Setup

```bash
cd mcp-server
python -m venv .venv
pip install fastmcp sqlalchemy python-slugify
```

## Run

```bash
# Test with MCP inspector
fastmcp dev server.py

# Or run directly
python server.py
```

## Configure in Claude Code

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "beaver-blueprint": {
      "command": "python",
      "args": ["D:/claude/Beaver Blueprint/mcp-server/server.py"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects, optionally filter by status |
| `get_project_detail` | Get detailed project info with stats |
| `create_project` | Create a new project |
| `get_plan` | Get the current plan for a project |
| `update_plan` | Update a project's plan (Markdown) |
| `list_issues` | List issues, optionally filter by status |
| `create_issue` | Create a new issue |
| `update_issue` | Update issue status, priority, title, or description |
| `log_progress` | Log a progress entry (0-100%) |
| `get_activity` | Get recent activity feed |
| `list_docs` | List all documents for a project |
| `get_doc` | Get a document's content |
| `create_doc` | Create a new document |
| `update_doc` | Update a document |

All tools return human-readable Markdown text. The MCP server accesses the SQLite database directly (no REST API dependency).
