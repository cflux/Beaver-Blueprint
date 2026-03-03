BASE_PROJECTS = "/api/v1/projects"

PROJECT = {"name": "Research Project", "category": "software"}
ITEM = {"title": "Battery options", "notes": "Look at 18650 cells", "tag": "hardware"}


async def _create_project(client):
    r = await client.post(BASE_PROJECTS, json=PROJECT)
    assert r.status_code == 201
    return r.json()["slug"]


async def test_list_research_empty(client):
    slug = await _create_project(client)
    r = await client.get(f"{BASE_PROJECTS}/{slug}/research")
    assert r.status_code == 200
    assert r.json() == []


async def test_create_research_item(client):
    slug = await _create_project(client)
    r = await client.post(f"{BASE_PROJECTS}/{slug}/research", json=ITEM)
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Battery options"
    assert data["tag"] == "hardware"
    assert data["notes"] == "Look at 18650 cells"
    assert "id" in data


async def test_list_research_items(client):
    slug = await _create_project(client)
    await client.post(f"{BASE_PROJECTS}/{slug}/research", json=ITEM)
    await client.post(f"{BASE_PROJECTS}/{slug}/research", json={**ITEM, "title": "Display options", "tag": "display"})
    r = await client.get(f"{BASE_PROJECTS}/{slug}/research")
    assert r.status_code == 200
    assert len(r.json()) == 2


async def test_list_research_tags(client):
    slug = await _create_project(client)
    await client.post(f"{BASE_PROJECTS}/{slug}/research", json={**ITEM, "tag": "hardware"})
    await client.post(f"{BASE_PROJECTS}/{slug}/research", json={**ITEM, "title": "Display", "tag": "display"})
    await client.post(f"{BASE_PROJECTS}/{slug}/research", json={**ITEM, "title": "No tag", "tag": ""})
    r = await client.get(f"{BASE_PROJECTS}/{slug}/research/tags")
    assert r.status_code == 200
    assert set(r.json()) == {"hardware", "display"}


async def test_update_research_item(client):
    slug = await _create_project(client)
    item_r = await client.post(f"{BASE_PROJECTS}/{slug}/research", json=ITEM)
    item_id = item_r.json()["id"]
    r = await client.put(f"{BASE_PROJECTS}/{slug}/research/{item_id}", json={"tag": "power"})
    assert r.status_code == 200
    assert r.json()["tag"] == "power"


async def test_delete_research_item(client):
    slug = await _create_project(client)
    item_r = await client.post(f"{BASE_PROJECTS}/{slug}/research", json=ITEM)
    item_id = item_r.json()["id"]
    r = await client.delete(f"{BASE_PROJECTS}/{slug}/research/{item_id}")
    assert r.status_code == 204
    r = await client.get(f"{BASE_PROJECTS}/{slug}/research")
    assert r.json() == []
