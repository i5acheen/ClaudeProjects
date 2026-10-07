"""Storage: conversation history, processed message IDs and lead state per phone number.

Uses Postgres when DATABASE_URL is set (e.g. Neon free tier, survives restarts),
otherwise a local SQLite file (development and tests). Both share one interface.
"""

from __future__ import annotations

import json
import logging
import sqlite3
import threading
from pathlib import Path

log = logging.getLogger(__name__)

LEAD_FIELDS = ("name", "city", "concern", "duration", "preferred_time", "status", "summary")

_SQLITE_SCHEMA = """
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
CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    phone      TEXT NOT NULL,
    route      TEXT NOT NULL,
    detail     TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

_POSTGRES_SCHEMA = """
CREATE TABLE IF NOT EXISTS messages (
    id         BIGSERIAL PRIMARY KEY,
    phone      TEXT NOT NULL,
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages (phone, id);
CREATE TABLE IF NOT EXISTS processed_messages (
    message_id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS leads (
    phone             TEXT PRIMARY KEY,
    profile_name      TEXT,
    language          TEXT,
    data              TEXT NOT NULL DEFAULT '{}',
    details_confirmed INTEGER NOT NULL DEFAULT 0,
    first_seen        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events (
    id         BIGSERIAL PRIMARY KEY,
    phone      TEXT NOT NULL,
    route      TEXT NOT NULL,
    detail     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def _is_postgres(target: str) -> bool:
    return target.startswith(("postgres://", "postgresql://"))


class Database:
    def __init__(self, target: Path | str):
        """target: a SQLite file path, ':memory:', or a postgres:// URL."""
        self._target = str(target)
        self._pg = _is_postgres(self._target)
        self._lock = threading.Lock()
        self._conn = None
        self._connect()

    # ---- connection handling ----
    def _connect(self) -> None:
        if self._pg:
            import psycopg
            from psycopg.rows import dict_row

            self._conn = psycopg.connect(self._target, autocommit=True, row_factory=dict_row)
            with self._conn.cursor() as cur:
                cur.execute(_POSTGRES_SCHEMA)
        else:
            if self._target != ":memory:":
                Path(self._target).parent.mkdir(parents=True, exist_ok=True)
            self._conn = sqlite3.connect(self._target, check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
            self._conn.executescript(_SQLITE_SCHEMA)
            self._conn.commit()

    def _run(self, sql: str, params: tuple = (), fetch: str | None = None):
        """Execute one statement. `?` placeholders work for both backends."""
        with self._lock:
            for attempt in range(2):
                try:
                    if self._pg:
                        with self._conn.cursor() as cur:
                            cur.execute(sql.replace("?", "%s"), params)
                            if fetch == "one":
                                return cur.fetchone()
                            if fetch == "all":
                                return cur.fetchall()
                            return cur.rowcount
                    cur = self._conn.execute(sql, params)
                    if fetch == "one":
                        row = cur.fetchone()
                        return dict(row) if row is not None else None
                    if fetch == "all":
                        return [dict(r) for r in cur.fetchall()]
                    self._conn.commit()
                    return cur.rowcount
                except Exception as exc:
                    # Postgres connections can drop (e.g. Neon idles): reconnect once and retry.
                    if self._pg and attempt == 0 and type(exc).__name__ in ("OperationalError", "InterfaceError"):
                        log.warning("Database connection lost, reconnecting")
                        self._connect()
                        continue
                    raise

    def ping(self) -> bool:
        try:
            return self._run("SELECT 1 AS ok", fetch="one") is not None
        except Exception:
            log.exception("Database ping failed")
            return False

    # ---- de-duplication ----
    def mark_processed(self, message_id: str) -> bool:
        """Record an ID. Returns False if it was already recorded (duplicate)."""
        n = self._run("INSERT INTO processed_messages (message_id) VALUES (?) ON CONFLICT DO NOTHING",
                      (message_id,))
        return n == 1

    # ---- conversation history ----
    def add_message(self, phone: str, role: str, content: str) -> None:
        self._run("INSERT INTO messages (phone, role, content) VALUES (?, ?, ?)", (phone, role, content))

    def recent_messages(self, phone: str, limit: int) -> list[dict]:
        rows = self._run("SELECT role, content FROM messages WHERE phone = ? ORDER BY id DESC LIMIT ?",
                         (phone, limit), fetch="all")
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

    def has_assistant_replied(self, phone: str) -> bool:
        row = self._run("SELECT 1 AS x FROM messages WHERE phone = ? AND role = 'assistant' LIMIT 1",
                        (phone,), fetch="one")
        return row is not None

    # ---- lead state ----
    def get_lead(self, phone: str) -> dict:
        row = self._run("SELECT * FROM leads WHERE phone = ?", (phone,), fetch="one")
        if row is None:
            return {"phone": phone, "data": {f: None for f in LEAD_FIELDS}, "language": None,
                    "profile_name": None, "details_confirmed": False, "first_seen": None}
        data = {f: None for f in LEAD_FIELDS} | json.loads(row["data"])
        return {"phone": phone, "data": data, "language": row["language"],
                "profile_name": row["profile_name"],
                "details_confirmed": bool(row["details_confirmed"]),
                "first_seen": str(row["first_seen"])}

    def save_lead(self, phone: str, data: dict, language: str | None,
                  profile_name: str | None, details_confirmed: bool) -> None:
        greatest = "GREATEST" if self._pg else "MAX"
        now = "now()" if self._pg else "datetime('now')"
        self._run(
            f"""
            INSERT INTO leads (phone, profile_name, language, data, details_confirmed)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (phone) DO UPDATE SET
                profile_name = COALESCE(excluded.profile_name, leads.profile_name),
                language = COALESCE(excluded.language, leads.language),
                data = excluded.data,
                details_confirmed = {greatest}(leads.details_confirmed, excluded.details_confirmed),
                updated_at = {now}
            """,
            (phone, profile_name, language, json.dumps(data, ensure_ascii=False), int(details_confirmed)),
        )

    # ---- analytics: which path answered each message (menu/flow vs LLM) ----
    def log_event(self, phone: str, route: str, detail: str | None = None) -> None:
        try:
            self._run("INSERT INTO events (phone, route, detail) VALUES (?, ?, ?)",
                      (phone, route, (detail or "")[:300] or None))
        except Exception:
            log.exception("Could not log event")

    def route_counts(self) -> list[dict]:
        rows = self._run("SELECT route, COUNT(*) AS n FROM events GROUP BY route ORDER BY n DESC",
                         fetch="all")
        return [{"route": r["route"], "n": int(r["n"])} for r in rows]

    def recent_events(self, route_prefix: str, limit: int = 100) -> list[dict]:
        rows = self._run("SELECT phone, route, detail, created_at FROM events WHERE route LIKE ? "
                         "ORDER BY id DESC LIMIT ?", (route_prefix + "%", limit), fetch="all")
        return [{"phone": r["phone"], "route": r["route"], "detail": r["detail"],
                 "created_at": str(r["created_at"])} for r in rows]

    def unconfirmed_leads(self, limit: int = 500) -> list[str]:
        """Phones of recent leads that haven't confirmed a booking (for follow-ups)."""
        rows = self._run("SELECT phone FROM leads WHERE details_confirmed = 0 ORDER BY updated_at DESC LIMIT ?",
                         (limit,), fetch="all")
        return [r["phone"] for r in rows]
