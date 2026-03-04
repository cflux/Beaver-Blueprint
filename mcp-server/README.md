# Beaver Blueprint — MCP Server

MCP (Model Context Protocol) server that gives Claude Code direct access to project data via SSE over HTTP.

## How it works

The MCP server runs as a Docker container alongside the backend, sharing the same SQLite volume. Claude Code connects to it remotely over HTTP — no local installation needed on your machine.

```
Claude Code (your machine) ──HTTP SSE──► MCP Server (Docker :8001) ──SQLite──► DB volume
```

## Deploy (Docker server)

The MCP server starts automatically with the rest of the stack:

```bash
docker compose up -d
```

The server listens on port `8001` and exposes the SSE endpoint at `/sse`.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `BB_DB_PATH` | `/app/data/beaver.db` | Path to the SQLite database |
| `MCP_HOST` | `0.0.0.0` | Bind host |
| `MCP_PORT` | `8001` | Bind port |

## Configure Claude Code (your machine)

Edit `.claude/settings.json` in this project (or your global Claude Code settings) and replace `YOUR-SERVER-IP` with your Docker server's IP or hostname:

```json
{
  "mcpServers": {
    "beaver-blueprint": {
      "url": "http://YOUR-SERVER-IP:8001/sse"
    }
  }
}
```

Then restart Claude Code. It will connect to the remote MCP server automatically and the tools will appear in your session.

> **Note:** Make sure port `8001` is reachable from your machine. If your server has a firewall, open TCP 8001 for your local network.

### Verify the connection

You can test the endpoint is reachable before configuring Claude Code:

```bash
curl http://YOUR-SERVER-IP:8001/sse
```

You should see an SSE stream open (the connection will hang open — that's correct). `Ctrl+C` to exit.

## Available tools

| Tool | Description |
|---|---|
| `list_projects` | List all projects, optionally filter by status |
| `get_project_detail` | Get detailed project info with stats |
| `create_project` | Create a new project |
| `update_project` | Update name, description, category, or goal |
| `update_project_status` | Update project status |
| `get_plan` | Get the current plan for a project |
| `update_plan` | Update a project's plan (Markdown) |
| `get_plan_versions` | View plan version history |
| `list_issues` | List issues, optionally filter by status/priority |
| `create_issue` | Create a new issue |
| `update_issue` | Update issue status, priority, title, or description |
| `delete_issue` | Delete an issue permanently |
| `list_milestones` | List milestones for a project |
| `create_milestone` | Create a new milestone |
| `update_milestone` | Update milestone status or details |
| `log_progress` | Log a progress entry (0-100%) |
| `get_activity` | Get recent activity feed |
| `list_docs` | List all documents for a project |
| `get_doc` | Get a document's content |
| `create_doc` | Create a new document |
| `update_doc` | Update a document |
| `delete_doc` | Delete a document permanently |
| `list_research` | List research items for a project |
| `get_research_item` | Get full details of a research item |
| `create_research_item` | Add a research item |
| `update_research_item` | Update a research item |
| `delete_research_item` | Delete a research item |
