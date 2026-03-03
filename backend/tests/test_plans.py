BASE_PROJECTS = "/api/v1/projects"

PROJECT = {"name": "Plan Project", "category": "software"}


async def _create_project(client):
    r = await client.post(BASE_PROJECTS, json=PROJECT)
    return r.json()["slug"]


async def test_get_plan_auto_creates(client):
    slug = await _create_project(client)
    r = await client.get(f"{BASE_PROJECTS}/{slug}/plan")
    assert r.status_code == 200
    data = r.json()
    assert data["content"] == ""
    assert data["version"] == 1


async def test_update_plan(client):
    slug = await _create_project(client)
    r = await client.put(f"{BASE_PROJECTS}/{slug}/plan", json={"content": "# My Plan\n\nStep 1."})
    assert r.status_code == 200
    data = r.json()
    assert data["content"] == "# My Plan\n\nStep 1."
    assert data["version"] == 1


async def test_update_plan_increments_version(client):
    slug = await _create_project(client)
    await client.put(f"{BASE_PROJECTS}/{slug}/plan", json={"content": "v1"})
    r = await client.put(f"{BASE_PROJECTS}/{slug}/plan", json={"content": "v2"})
    assert r.status_code == 200
    assert r.json()["version"] == 2


async def test_plan_versions_history(client):
    slug = await _create_project(client)
    await client.put(f"{BASE_PROJECTS}/{slug}/plan", json={"content": "v1"})
    await client.put(f"{BASE_PROJECTS}/{slug}/plan", json={"content": "v2"})
    await client.put(f"{BASE_PROJECTS}/{slug}/plan", json={"content": "v3"})

    r = await client.get(f"{BASE_PROJECTS}/{slug}/plan/versions")
    assert r.status_code == 200
    versions = r.json()
    assert len(versions) == 2
    assert versions[0]["content"] == "v2"
    assert versions[1]["content"] == "v1"
