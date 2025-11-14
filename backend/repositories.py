from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, Iterable, List, Optional

from .database import get_connection


@dataclass
class Team:
    id: int
    name: str
    short_name: str
    level: str
    coach: str
    training_days: str
    focus_theme: str
    athlete_count: int
    upcoming_session: Optional[str]


@dataclass
class Athlete:
    id: int
    first_name: str
    last_name: str
    birth_year: int
    primary_stroke: str
    best_event: str
    personal_best: Optional[float]
    personal_best_unit: Optional[str]
    focus_note: Optional[str]
    team_id: int
    team_name: str
    last_metric: Optional[str]
    last_metric_value: Optional[float]
    last_metric_unit: Optional[str]


def fetch_dashboard_kpis() -> Dict[str, Any]:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_sessions,
                SUM(CASE WHEN status = 'abgeschlossen' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'gestartet' THEN 1 ELSE 0 END) AS in_progress,
                SUM(load_actual) AS total_load_actual,
                SUM(load_target) AS total_load_target
            FROM sessions
            """
        )
        sessions = cursor.fetchone()

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM attendance a
            JOIN sessions s ON s.id = a.session_id
            WHERE s.session_date >= date('now', '-30 day') AND a.status = 'anwesend'
            """
        )
        attended = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM attendance a
            JOIN sessions s ON s.id = a.session_id
            WHERE s.session_date >= date('now', '-30 day')
            """
        )
        total_attendance = cursor.fetchone()[0] or 1

        cursor.execute(
            """
            SELECT session_date, title, focus_area
            FROM sessions
            WHERE session_date >= date('now')
            ORDER BY session_date ASC
            LIMIT 5
            """
        )
        upcoming = [dict(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT focus_area, COUNT(*) AS count
            FROM sessions
            WHERE session_date >= date('now', '-45 day')
            GROUP BY focus_area
            ORDER BY count DESC
            LIMIT 6
            """
        )
        focus_topics = [dict(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT title, session_date, status
            FROM sessions
            ORDER BY session_date DESC, id DESC
            LIMIT 6
            """
        )
        session_events = [dict(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT a.first_name || ' ' || a.last_name AS athlete,
                   m.metric_type,
                   m.metric_date,
                   m.value,
                   m.unit
            FROM metrics m
            JOIN athletes a ON a.id = m.athlete_id
            ORDER BY m.metric_date DESC, m.id DESC
            LIMIT 4
            """
        )
        metric_events = [dict(row) for row in cursor.fetchall()]

        activities: List[Dict[str, Any]] = []
        for event in session_events:
            activities.append(
                {
                    "type": "training",
                    "title": event["title"],
                    "status": event["status"],
                    "date": event["session_date"],
                }
            )
        for metric in metric_events:
            activities.append(
                {
                    "type": "metric",
                    "title": metric["metric_type"],
                    "status": f"{metric['athlete']} {metric['value']} {metric['unit']}",
                    "date": metric["metric_date"],
                }
            )
        activities.sort(key=lambda item: item["date"], reverse=True)

        attendance_rate = attended / total_attendance
        completed_sessions = sessions["completed"] or 0
        return {
            "attendance_rate": round(attendance_rate, 2),
            "completed_sessions": completed_sessions,
            "in_progress_sessions": sessions["in_progress"] or 0,
            "planned_sessions": sessions["total_sessions"] - completed_sessions,
            "total_load_actual": sessions["total_load_actual"] or 0,
            "total_load_target": sessions["total_load_target"] or 0,
            "upcoming_sessions": upcoming,
            "focus_topics": focus_topics,
            "activities": activities[:6],
        }


def fetch_teams() -> List[Team]:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT t.*, COUNT(a.id) AS athlete_count,
                   (
                       SELECT session_date || ' • ' || title
                       FROM sessions s
                       WHERE s.team_id = t.id AND s.session_date >= date('now')
                       ORDER BY s.session_date ASC
                       LIMIT 1
                   ) AS upcoming_session
            FROM teams t
            LEFT JOIN athletes a ON a.team_id = t.id
            GROUP BY t.id
            ORDER BY t.name
            """
        )
        return [Team(**dict(row)) for row in cursor.fetchall()]


def fetch_team(team_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM teams WHERE id = ?", (team_id,))
        team = cursor.fetchone()
        if team is None:
            return None

        cursor.execute(
            """
            SELECT id, title, session_date, start_time, status, focus_area
            FROM sessions
            WHERE team_id = ?
            ORDER BY session_date DESC
            LIMIT 5
            """,
            (team_id,),
        )
        sessions = [dict(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT status, COUNT(*) AS count
            FROM sessions
            WHERE team_id = ?
            GROUP BY status
            """,
            (team_id,),
        )
        status_breakdown = {row["status"]: row["count"] for row in cursor.fetchall()}

        return {
            "team": dict(team),
            "recent_sessions": sessions,
            "status_breakdown": status_breakdown,
        }


def fetch_athletes() -> List[Athlete]:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT a.*, t.name AS team_name,
                   (
                       SELECT metric_date
                       FROM metrics m
                       WHERE m.athlete_id = a.id
                       ORDER BY metric_date DESC, id DESC
                       LIMIT 1
                   ) AS last_metric,
                   (
                       SELECT value
                       FROM metrics m
                       WHERE m.athlete_id = a.id
                       ORDER BY metric_date DESC, id DESC
                       LIMIT 1
                   ) AS last_metric_value,
                   (
                       SELECT unit
                       FROM metrics m
                       WHERE m.athlete_id = a.id
                       ORDER BY metric_date DESC, id DESC
                       LIMIT 1
                   ) AS last_metric_unit
            FROM athletes a
            JOIN teams t ON t.id = a.team_id
            ORDER BY a.last_name
            """
        )
        return [Athlete(**dict(row)) for row in cursor.fetchall()]


def fetch_athlete(athlete_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT a.*, t.name AS team_name
            FROM athletes a
            JOIN teams t ON t.id = a.team_id
            WHERE a.id = ?
            """,
            (athlete_id,),
        )
        athlete = cursor.fetchone()
        if athlete is None:
            return None

        cursor.execute(
            """
            SELECT metric_date, metric_type, value, unit
            FROM metrics
            WHERE athlete_id = ?
            ORDER BY metric_date DESC
            LIMIT 8
            """,
            (athlete_id,),
        )
        metrics = [dict(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT s.title, s.session_date, a.status
            FROM attendance a
            JOIN sessions s ON s.id = a.session_id
            WHERE a.athlete_id = ?
            ORDER BY s.session_date DESC
            LIMIT 5
            """,
            (athlete_id,),
        )
        attendance_history = [dict(row) for row in cursor.fetchall()]

        return {
            "athlete": dict(athlete),
            "metrics": metrics,
            "attendance_history": attendance_history,
        }


def fetch_sessions(team_id: Optional[int] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    query = [
        "SELECT s.*, t.name AS team_name, t.short_name AS team_short_name",
        "FROM sessions s",
        "JOIN teams t ON t.id = s.team_id",
        "WHERE 1 = 1",
    ]
    params: List[Any] = []
    if team_id is not None:
        query.append("AND t.id = ?")
        params.append(team_id)
    if status is not None:
        query.append("AND s.status = ?")
        params.append(status)
    query.append("ORDER BY s.session_date DESC, s.start_time DESC")
    sql = " \n".join(query)

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(sql, params)
        sessions = [dict(row) for row in cursor.fetchall()]

    return sessions


def fetch_session(session_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT s.*, t.name AS team_name
            FROM sessions s
            JOIN teams t ON t.id = s.team_id
            WHERE s.id = ?
            """,
            (session_id,),
        )
        session = cursor.fetchone()
        if session is None:
            return None

        cursor.execute(
            """
            SELECT a.id, a.first_name, a.last_name, att.status, att.note
            FROM athletes a
            LEFT JOIN attendance att ON att.athlete_id = a.id AND att.session_id = ?
            WHERE a.team_id = ?
            ORDER BY a.last_name
            """,
            (session_id, session["team_id"]),
        )
        attendees = [dict(row) for row in cursor.fetchall()]

        return {"session": dict(session), "attendance": attendees}


def update_session(session_id: int, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    columns = []
    params: List[Any] = []
    for key, value in payload.items():
        if key in {"status", "focus_area", "notes", "load_actual"}:
            columns.append(f"{key} = ?")
            params.append(value)
    if not columns:
        return fetch_session(session_id)

    params.append(session_id)
    sql = f"UPDATE sessions SET {', '.join(columns)} WHERE id = ?"

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(sql, params)
        connection.commit()

    return fetch_session(session_id)


def upsert_attendance(session_id: int, rows: Iterable[Dict[str, Any]]) -> None:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.executemany(
            """
            INSERT INTO attendance (session_id, athlete_id, status, note)
            VALUES (:session_id, :athlete_id, :status, :note)
            ON CONFLICT(session_id, athlete_id) DO UPDATE SET
                status = excluded.status,
                note = excluded.note
            """,
            (
                {
                    "session_id": session_id,
                    "athlete_id": row["athlete_id"],
                    "status": row.get("status", "anwesend"),
                    "note": row.get("note"),
                }
                for row in rows
            ),
        )
        connection.commit()


def fetch_reports() -> List[Dict[str, Any]]:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT r.*, t.name AS team_name
            FROM reports r
            JOIN teams t ON t.id = r.team_id
            ORDER BY r.period_end DESC
            """
        )
        return [dict(row) for row in cursor.fetchall()]


def fetch_latest_note() -> Optional[Dict[str, Any]]:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT * FROM coach_notes ORDER BY updated_at DESC, id DESC LIMIT 1
            """
        )
        note = cursor.fetchone()
        return dict(note) if note else None


def save_note(body: str) -> Dict[str, Any]:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO coach_notes (body, updated_at)
            VALUES (?, datetime('now'))
            """,
            (body,),
        )
        connection.commit()
        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM coach_notes WHERE id = ?", (new_id,))
        return dict(cursor.fetchone())


def fetch_metrics(team_id: Optional[int] = None, metric_type: Optional[str] = None) -> List[Dict[str, Any]]:
    query = [
        "SELECT m.*, a.first_name, a.last_name, t.name AS team_name",
        "FROM metrics m",
        "JOIN athletes a ON a.id = m.athlete_id",
        "JOIN teams t ON t.id = a.team_id",
        "WHERE 1 = 1",
    ]
    params: List[Any] = []
    if team_id is not None:
        query.append("AND t.id = ?")
        params.append(team_id)
    if metric_type is not None:
        query.append("AND m.metric_type = ?")
        params.append(metric_type)
    query.append("ORDER BY m.metric_date DESC, m.id DESC")
    sql = " \n".join(query)

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def team_to_dict(team: Team) -> Dict[str, Any]:
    return asdict(team)


def athlete_to_dict(athlete: Athlete) -> Dict[str, Any]:
    return asdict(athlete)
