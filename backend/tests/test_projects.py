import pytest

BASE = "/api/v1/projects"

PROJECT_PAYLOAD = {
    "name": "Test Project",
    "description": "A test project",
    "category": "software",
    "status": "concept",
}


async def test_list_projects_empty(client):
    r = await client.get(BASE)
    assert r.status_code == 200
    assert r.json() == {"projects": [], "total": 0}


async def test_create_project(client):
    r = await client.post(BASE, json=PROJECT_PAYLOAD)
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Test Project"
    assert data["slug"] == "test-project"
    assert data["status"] == "concept"
    assert data["category"] == "software"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


async def test_create_project_slug_collision(client):
    await client.post(BASE, json=PROJECT_PAYLOAD)
    r = await client.post(BASE, json=PROJECT_PAYLOAD)
    assert r.status_code == 409


async def test_get_project(client):
    await client.post(BASE, json=PROJECT_PAYLOAD)
    r = await client.get(f"{BASE}/test-project")
    assert r.status_code == 200
    assert r.json()["slug"] == "test-project"


async def test_get_project_not_found(client):
    r = await client.get(f"{BASE}/does-not-exist")
    assert r.status_code == 404


async def test_update_project_goal(client):
    await client.post(BASE, json=PROJECT_PAYLOAD)
    r = await client.put(f"{BASE}/test-project", json={"goal": "Ship it by Q3"})
    assert r.status_code == 200
    assert r.json()["goal"] == "Ship it by Q3"


async def test_update_project_status(client):
    await client.post(BASE, json=PROJECT_PAYLOAD)
    r = await client.put(f"{BASE}/test-project", json={"status": "active"})
    assert r.status_code == 200
    assert r.json()["status"] == "active"


async def test_update_project_name_changes_slug(client):
    await client.post(BASE, json=PROJECT_PAYLOAD)
    r = await client.put(f"{BASE}/test-project", json={"name": "Renamed Project"})
    assert r.status_code == 200
    assert r.json()["slug"] == "renamed-project"


async def test_delete_project(client):
    await client.post(BASE, json=PROJECT_PAYLOAD)
    r = await client.delete(f"{BASE}/test-project")
    assert r.status_code == 204
    r = await client.get(f"{BASE}/test-project")
    assert r.status_code == 404


async def test_list_categories(client):
    await client.post(BASE, json=PROJECT_PAYLOAD)
    await client.post(BASE, json={**PROJECT_PAYLOAD, "name": "Another", "category": "hardware"})
    r = await client.get(f"{BASE}/categories")
    assert r.status_code == 200
    assert set(r.json()) == {"software", "hardware"}


async def test_project_stats(client):
    await client.post(BASE, json=PROJECT_PAYLOAD)
    r = await client.get(f"{BASE}/test-project/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["open_issues"] == 0
    assert data["closed_issues"] == 0
    assert data["progress"] == 0
