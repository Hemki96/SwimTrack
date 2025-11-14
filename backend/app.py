from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import ensure_database
from .repositories import (
    athlete_to_dict,
    fetch_athlete,
    fetch_athletes,
    fetch_dashboard_kpis,
    fetch_latest_note,
    fetch_metrics,
    fetch_reports,
    fetch_session,
    fetch_sessions,
    fetch_team,
    fetch_teams,
    save_note,
    team_to_dict,
    update_session,
    upsert_attendance,
)

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "src"
INDEX_FILE = BASE_DIR / "index.html"

ensure_database()

app = FastAPI(title="SwimTrack API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    ensure_database()


if STATIC_DIR.exists():
    app.mount("/src", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
async def serve_index() -> FileResponse:
    if not INDEX_FILE.exists():
        raise HTTPException(status_code=404, detail="Index-Datei nicht gefunden")
    return FileResponse(INDEX_FILE)


@app.get("/dashboard")
def get_dashboard() -> Dict[str, Any]:
    payload = fetch_dashboard_kpis()
    note = fetch_latest_note()
    if note:
        payload["coach_note"] = note
    return payload


@app.get("/teams")
def list_teams() -> List[Dict[str, Any]]:
    return [team_to_dict(team) for team in fetch_teams()]


@app.get("/teams/{team_id}")
def get_team(team_id: int) -> Dict[str, Any]:
    team = fetch_team(team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team nicht gefunden")
    return team


@app.get("/athletes")
def list_athletes() -> List[Dict[str, Any]]:
    return [athlete_to_dict(athlete) for athlete in fetch_athletes()]


@app.get("/athletes/{athlete_id}")
def get_athlete(athlete_id: int) -> Dict[str, Any]:
    athlete = fetch_athlete(athlete_id)
    if athlete is None:
        raise HTTPException(status_code=404, detail="Athlet:in nicht gefunden")
    return athlete


@app.get("/sessions")
def list_sessions(team_id: Optional[int] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    return fetch_sessions(team_id=team_id, status=status)


@app.get("/sessions/{session_id}")
def get_session(session_id: int) -> Dict[str, Any]:
    data = fetch_session(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Trainingseinheit nicht gefunden")
    return data


@app.patch("/sessions/{session_id}")
def patch_session(session_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = update_session(session_id, payload)
    if data is None:
        raise HTTPException(status_code=404, detail="Trainingseinheit nicht gefunden")
    return data


@app.post("/sessions/{session_id}/attendance")
def post_attendance(session_id: int, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not entries:
        raise HTTPException(status_code=400, detail="Keine Einträge übermittelt")
    upsert_attendance(session_id, entries)
    data = fetch_session(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Trainingseinheit nicht gefunden")
    return data


@app.get("/reports")
def list_reports() -> List[Dict[str, Any]]:
    return fetch_reports()


@app.post("/notes")
def save_coach_note(payload: Dict[str, Any]) -> Dict[str, Any]:
    body = payload.get("body")
    if not body:
        raise HTTPException(status_code=400, detail="Notiz darf nicht leer sein")
    note = save_note(body)
    return note


@app.get("/metrics")
def list_metrics(team_id: Optional[int] = None, metric_type: Optional[str] = None) -> List[Dict[str, Any]]:
    return fetch_metrics(team_id=team_id, metric_type=metric_type)
