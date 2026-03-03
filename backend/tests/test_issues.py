BASE_PROJECTS = "/api/v1/projects"

PROJECT = {"name": "Issue Project", "category": "software"}
ISSUE = {"title": "Fix the bug", "description": "It crashes on startup", "priority": "high"}


async def _create_project(client):
    r = await client.post(BASE_PROJECTS, json=PROJECT)
    return r.json()["slug"]


async def test_list_issues_empty(client):
    slug = await _create_project(client)
    r = await client.get(f"{BASE_PROJECTS}/{slug}/issues")
    assert r.status_code == 200
    assert r.json() == []


async def test_create_issue(client):
    slug = await _create_project(client)
    r = await client.post(f"{BASE_PROJECTS}/{slug}/issues", json=ISSUE)
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Fix the bug"
    assert data["status"] == "open"
    assert data["priority"] == "high"


async def test_get_issue(client):
    slug = await _create_project(client)
    issue_id = (await client.post(f"{BASE_PROJECTS}/{slug}/issues", json=ISSUE)).json()["id"]
    r = await client.get(f"{BASE_PROJECTS}/{slug}/issues/{issue_id}")
    assert r.status_code == 200
    assert r.json()["id"] == issue_id


async def test_get_issue_not_found(client):
    slug = await _create_project(client)
    r = await client.get(f"{BASE_PROJECTS}/{slug}/issues/9999")
    assert r.status_code == 404


async def test_update_issue_status(client):
    slug = await _create_project(client)
    issue_id = (await client.post(f"{BASE_PROJECTS}/{slug}/issues", json=ISSUE)).json()["id"]
    r = await client.put(f"{BASE_PROJECTS}/{slug}/issues/{issue_id}", json={"status": "closed"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "closed"
    assert data["closed_at"] is not None


async def test_close_then_reopen_issue(client):
    slug = await _create_project(client)
    issue_id = (await client.post(f"{BASE_PROJECTS}/{slug}/issues", json=ISSUE)).json()["id"]
    await client.put(f"{BASE_PROJECTS}/{slug}/issues/{issue_id}", json={"status": "closed"})
    r = await client.put(f"{BASE_PROJECTS}/{slug}/issues/{issue_id}", json={"status": "open"})
    assert r.status_code == 200
    assert r.json()["closed_at"] is None


async def test_filter_issues_by_status(client):
    slug = await _create_project(client)
    issue_id = (await client.post(f"{BASE_PROJECTS}/{slug}/issues", json=ISSUE)).json()["id"]
    await client.post(f"{BASE_PROJECTS}/{slug}/issues", json={**ISSUE, "title": "Another"})
    await client.put(f"{BASE_PROJECTS}/{slug}/issues/{issue_id}", json={"status": "closed"})

    r = await client.get(f"{BASE_PROJECTS}/{slug}/issues?status=open")
    assert len(r.json()) == 1

    r = await client.get(f"{BASE_PROJECTS}/{slug}/issues?status=closed")
    assert len(r.json()) == 1


async def test_delete_issue(client):
    slug = await _create_project(client)
    issue_id = (await client.post(f"{BASE_PROJECTS}/{slug}/issues", json=ISSUE)).json()["id"]
    r = await client.delete(f"{BASE_PROJECTS}/{slug}/issues/{issue_id}")
    assert r.status_code == 204
    r = await client.get(f"{BASE_PROJECTS}/{slug}/issues/{issue_id}")
    assert r.status_code == 404


async def test_project_stats_reflect_issues(client):
    slug = await _create_project(client)
    issue_id = (await client.post(f"{BASE_PROJECTS}/{slug}/issues", json=ISSUE)).json()["id"]
    await client.post(f"{BASE_PROJECTS}/{slug}/issues", json={**ISSUE, "title": "Second"})
    await client.put(f"{BASE_PROJECTS}/{slug}/issues/{issue_id}", json={"status": "closed"})

    r = await client.get(f"{BASE_PROJECTS}/{slug}/stats")
    assert r.status_code == 200
    assert r.json()["open_issues"] == 1
    assert r.json()["closed_issues"] == 1
