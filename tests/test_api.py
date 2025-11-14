from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.database import DB_PATH, ensure_database
from backend.seed import seed


@pytest.fixture(scope="module", autouse=True)
def setup_database() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()
    ensure_database()
    seed()


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def test_dashboard_endpoint(client: TestClient) -> None:
    response = client.get("/dashboard")
    assert response.status_code == 200
    payload = response.json()
    assert "attendance_rate" in payload
    assert "focus_topics" in payload
    assert isinstance(payload["focus_topics"], list)


def test_sessions_filter(client: TestClient) -> None:
    response = client.get("/sessions", params={"status": "abgeschlossen"})
    assert response.status_code == 200
    data = response.json()
    assert all(item["status"] == "abgeschlossen" for item in data)


def test_attendance_update(client: TestClient) -> None:
    session_id = client.get("/sessions").json()[0]["id"]
    response = client.get(f"/sessions/{session_id}")
    assert response.status_code == 200
    session_data = response.json()
    athlete_id = session_data["attendance"][0]["id"]

    update_payload = [{"athlete_id": athlete_id, "status": "anwesend", "note": "Test"}]
    update_response = client.post(
        f"/sessions/{session_id}/attendance",
        content=json.dumps(update_payload),
        headers={"Content-Type": "application/json"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    updated_entry = next(item for item in updated["attendance"] if item["id"] == athlete_id)
    assert updated_entry["status"] == "anwesend"
    assert updated_entry["note"] == "Test"


def test_save_note(client: TestClient) -> None:
    response = client.post("/notes", json={"body": "Neue Notiz"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["body"] == "Neue Notiz"
    assert "updated_at" in payload
