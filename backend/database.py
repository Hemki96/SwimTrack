from __future__ import annotations

import sqlite3
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "swimtrack.db"
DB_PATH = Path(os.getenv("SWIMTRACK_DB_PATH", DEFAULT_DB_PATH))


def initialise_database() -> None:
    schema_path = BASE_DIR / "schema.sql"
    if not schema_path.exists():
        raise FileNotFoundError("schema.sql not found. Cannot initialise database.")

    with sqlite3.connect(DB_PATH) as connection:
        connection.executescript(schema_path.read_text())
        connection.commit()


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
    finally:
        connection.close()


def ensure_database() -> None:
    if not DB_PATH.exists():
        initialise_database()
