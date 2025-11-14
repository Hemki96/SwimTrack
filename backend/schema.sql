PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

DROP TABLE IF EXISTS coach_notes;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS metrics;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS athletes;
DROP TABLE IF EXISTS teams;

CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    level TEXT NOT NULL,
    coach TEXT NOT NULL,
    training_days TEXT NOT NULL,
    focus_theme TEXT NOT NULL
);

CREATE TABLE athletes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_year INTEGER NOT NULL,
    primary_stroke TEXT NOT NULL,
    best_event TEXT NOT NULL,
    personal_best REAL,
    personal_best_unit TEXT,
    focus_note TEXT,
    team_id INTEGER NOT NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    session_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT NOT NULL,
    focus_area TEXT NOT NULL,
    load_target INTEGER NOT NULL,
    load_actual INTEGER,
    notes TEXT,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE attendance (
    session_id INTEGER NOT NULL,
    athlete_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    PRIMARY KEY (session_id, athlete_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
);

CREATE TABLE metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id INTEGER NOT NULL,
    metric_date TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    FOREIGN KEY (athlete_id) REFERENCES athletes(id)
);

CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    status TEXT NOT NULL,
    delivered_on TEXT,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE coach_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

COMMIT;
