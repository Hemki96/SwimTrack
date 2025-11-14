from __future__ import annotations

import json
import argparse
from datetime import datetime
from pathlib import Path

from .database import DB_PATH, ensure_database, get_connection


def seed(reset: bool = False) -> None:
    if reset and DB_PATH.exists():
        DB_PATH.unlink()

    ensure_database()
    data_path = Path(__file__).with_name("seed_data.json")
    payload = json.loads(data_path.read_text(encoding="utf-8"))

    with get_connection() as connection:
        cursor = connection.cursor()

        teams = payload["teams"]
        for team in teams:
            cursor.execute(
                """
                INSERT INTO teams (name, short_name, level, coach, training_days, focus_theme)
                VALUES (:name, :short_name, :level, :coach, :training_days, :focus_theme)
                """,
                team,
            )
        connection.commit()

        cursor.execute("SELECT id FROM teams ORDER BY id")
        team_ids = [row[0] for row in cursor.fetchall()]

        athletes = []
        for item in payload["athletes"]:
            team_id = team_ids[item.pop("team_index")]
            item["team_id"] = team_id
            athletes.append(item)
        cursor.executemany(
            """
            INSERT INTO athletes (
                first_name, last_name, birth_year, primary_stroke, best_event,
                personal_best, personal_best_unit, focus_note, team_id
            ) VALUES (
                :first_name, :last_name, :birth_year, :primary_stroke, :best_event,
                :personal_best, :personal_best_unit, :focus_note, :team_id
            )
            """,
            athletes,
        )
        connection.commit()

        cursor.execute("SELECT id FROM athletes ORDER BY id")
        athlete_ids = [row[0] for row in cursor.fetchall()]

        sessions = []
        for item in payload["sessions"]:
            team_id = team_ids[item.pop("team_index")]
            item["team_id"] = team_id
            sessions.append(item)
        cursor.executemany(
            """
            INSERT INTO sessions (
                team_id, title, session_date, start_time, duration_minutes,
                status, focus_area, load_target, load_actual, notes
            ) VALUES (
                :team_id, :title, :session_date, :start_time, :duration_minutes,
                :status, :focus_area, :load_target, :load_actual, :notes
            )
            """,
            sessions,
        )
        connection.commit()

        cursor.execute("SELECT id FROM sessions ORDER BY id")
        session_ids = [row[0] for row in cursor.fetchall()]

        attendance_rows = []
        for item in payload["attendance"]:
            session_id = session_ids[item.pop("session_index")]
            athlete_id = athlete_ids[item.pop("athlete_index")]
            attendance_rows.append(
                {
                    "session_id": session_id,
                    "athlete_id": athlete_id,
                    **item,
                }
            )
        cursor.executemany(
            """
            INSERT INTO attendance (session_id, athlete_id, status, note)
            VALUES (:session_id, :athlete_id, :status, :note)
            """,
            attendance_rows,
        )

        metrics = []
        for item in payload["metrics"]:
            athlete_id = athlete_ids[item.pop("athlete_index")]
            item["athlete_id"] = athlete_id
            metrics.append(item)
        cursor.executemany(
            """
            INSERT INTO metrics (athlete_id, metric_date, metric_type, value, unit)
            VALUES (:athlete_id, :metric_date, :metric_type, :value, :unit)
            """,
            metrics,
        )

        reports = []
        for item in payload["reports"]:
            team_id = team_ids[item.pop("team_index")]
            item["team_id"] = team_id
            reports.append(item)
        cursor.executemany(
            """
            INSERT INTO reports (team_id, title, period_start, period_end, status, delivered_on)
            VALUES (:team_id, :title, :period_start, :period_end, :status, :delivered_on)
            """,
            reports,
        )

        notes = payload.get("coach_notes")
        if notes:
            timestamp = notes["updated_at"]
            try:
                datetime.fromisoformat(timestamp)
            except ValueError:
                timestamp = datetime.utcnow().isoformat(timespec="seconds")
            cursor.execute(
                """
                INSERT INTO coach_notes (body, updated_at)
                VALUES (:body, :updated_at)
                """,
                {"body": notes["body"], "updated_at": timestamp},
            )

        connection.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed SwimTrack demo data")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Remove the existing database before seeding",
    )
    args = parser.parse_args()

    seed(reset=args.reset)
    print(f"Database initialised at {DB_PATH}")
