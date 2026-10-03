"""SQLite storage: conversation history, processed message IDs, and lead state per phone number."""

from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path

LEAD_FIELDS = ("name", "city", "concern", "duration", "preferred_time", "status", "summary")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    phone      TEXT NOT NULL,
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages (phone, id);

CREATE TABLE IF NOT EXISTS processed_messages (
    message_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
    phone             TEXT PRIMARY KEY,
    profile_name      TEXT,
    language          TEXT,
    data              TEXT NOT NULL DEFAULT '{}',
    details_confirmed INTEGER NOT NULL DEFAULT 0,
    first_seen        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


class Database:
    def __init__(self, path: Path | str):
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._conn.executescript(_SCHEMA)
            self._conn.commit()

    # ---- de-duplication ----
    def mark_processed(self, message_id: str) -> bool:
        """Record a message ID. Returns False if it was already processed (duplicate)."""
        with self._lock:
            cur = self._conn.execute(
                "INSERT OR IGNORE INTO processed_messages (message_id) VALUES (?)", (message_id,)
            )
            self._conn.commit()
            return cur.rowcount == 1

    # ---- conversation history ----
    def add_message(self, phone: str, role: str, content: str) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO messages (phone, role, content) VALUES (?, ?, ?)", (phone, role, content)
            )
            self._conn.commit()

    def recent_messages(self, phone: str, limit: int) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT role, content FROM messages WHERE phone = ? ORDER BY id DESC LIMIT ?",
                (phone, limit),
            ).fetchall()
        return [dict(r) for r in reversed(rows)]

    def has_assistant_replied(self, phone: str) -> bool:
        with self._lock:
            row = self._conn.execute(
                "SELECT 1 FROM messages WHERE phone = ? AND role = 'assistant' LIMIT 1", (phone,)
            ).fetchone()
        return row is not None

    # ---- lead state ----
    def get_lead(self, phone: str) -> dict:
        with self._lock:
            row = self._conn.execute("SELECT * FROM leads WHERE phone = ?", (phone,)).fetchone()
        if row is None:
            return {"phone": phone, "data": {f: None for f in LEAD_FIELDS}, "language": None,
                    "profile_name": None, "details_confirmed": False, "first_seen": None}
        data = {f: None for f in LEAD_FIELDS} | json.loads(row["data"])
        return {"phone": phone, "data": data, "language": row["language"],
                "profile_name": row["profile_name"],
                "details_confirmed": bool(row["details_confirmed"]),
                "first_seen": row["first_seen"]}

    def save_lead(self, phone: str, data: dict, language: str | None,
                  profile_name: str | None, details_confirmed: bool) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO leads (phone, profile_name, language, data, details_confirmed)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(phone) DO UPDATE SET
                    profile_name = COALESCE(excluded.profile_name, leads.profile_name),
                    language = COALESCE(excluded.language, leads.language),
                    data = excluded.data,
                    details_confirmed = MAX(leads.details_confirmed, excluded.details_confirmed),
                    updated_at = datetime('now')
                """,
                (phone, profile_name, language, json.dumps(data, ensure_ascii=False),
                 int(details_confirmed)),
            )
            self._conn.commit()
