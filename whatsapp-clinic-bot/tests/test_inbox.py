import base64
import time
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

import app.main as m
from app.agent import Agent, within_customer_window
from app.db import Database
from app.main import app

from .fakes import FakeLLM, FakeSender

PHONE = "919000000001"
PASSWORD = "test-inbox-pass"


def auth(password=PASSWORD, user="admin"):
    return {"Authorization": "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()}


@pytest.fixture
def setup():
    object.__setattr__(m.settings, "admin_password", PASSWORD)
    db = Database(":memory:")
    sender = FakeSender()
    app.state.db = db
    app.state.agent = Agent(db=db, llm=FakeLLM(), sender=sender, sheet=None)
    yield TestClient(app), db, sender
    object.__setattr__(m.settings, "admin_password", "")


def test_inbox_off_without_password():
    object.__setattr__(m.settings, "admin_password", "")
    app.state.db = Database(":memory:")
    assert TestClient(app).get("/admin/chats", headers=auth()).status_code == 404


def test_login_required(setup):
    c, _, _ = setup
    r = c.get("/admin/chats")
    assert r.status_code == 401 and "Basic" in r.headers["WWW-Authenticate"]
    assert c.get("/admin/chats", headers=auth("wrong")).status_code == 401
    assert c.get("/admin/chats", headers=auth(user="root")).status_code == 401
    assert c.get("/admin/chats", headers=auth()).status_code == 200


def test_list_and_chat_show_messages_escaped(setup):
    c, db, _ = setup
    db.add_message(PHONE, "user", "<script>alert(1)</script> पाय दुखतात")
    db.add_message(PHONE, "assistant", "नमस्कार!")
    db.save_lead(PHONE, {"name": "Ramesh", "status": "Hot"}, "mr", "Ramesh", False)
    page = c.get("/admin/chats", headers=auth()).text
    assert "Ramesh" in page and "Hot" in page and "<script>alert" not in page
    chat = c.get(f"/admin/chats/{PHONE}", headers=auth()).text
    assert "&lt;script&gt;" in chat and "पाय दुखतात" in chat and "नमस्कार!" in chat
    assert "Send on WhatsApp" in chat          # patient wrote just now -> reply allowed


def _csrf():
    return m._inbox_csrf()


def test_staff_reply_sends_and_pauses_bot(setup):
    c, db, sender = setup
    db.add_message(PHONE, "user", "hello")
    r = c.post(f"/admin/chats/{PHONE}/reply", data={"csrf": _csrf(), "text": "Doctor will call you"},
               headers=auth(), follow_redirects=False)
    assert r.status_code == 303 and r.headers["Location"].endswith("?m=sent")
    assert sender.sent[-1] == (PHONE, "Doctor will call you")
    assert db.conversation(PHONE)[-1]["content"] == "[Clinic staff] Doctor will call you"
    assert db.get_lead(PHONE)["data"]["_human_until"] > time.time()
    chat = c.get(f"/admin/chats/{PHONE}", headers=auth()).text
    assert "Clinic staff" in chat and "Resume bot" in chat


def test_reply_blocked_without_csrf(setup):
    c, db, sender = setup
    db.add_message(PHONE, "user", "hello")
    r = c.post(f"/admin/chats/{PHONE}/reply", data={"text": "x"}, headers=auth())
    assert r.status_code == 403 and sender.sent == []


def test_reply_blocked_after_24h(setup):
    c, db, sender = setup
    db._run("INSERT INTO messages (phone, role, content, created_at) VALUES (?, 'user', 'old', "
            "datetime('now', '-2 days'))", (PHONE,))
    r = c.post(f"/admin/chats/{PHONE}/reply", data={"csrf": _csrf(), "text": "hi"},
               headers=auth(), follow_redirects=False)
    assert r.headers["Location"].endswith("?m=window_closed") and sender.sent == []
    assert "more than 24 hours" in c.get(f"/admin/chats/{PHONE}", headers=auth()).text


def test_pause_and_resume(setup):
    c, db, _ = setup
    db.add_message(PHONE, "user", "hello")
    c.post(f"/admin/chats/{PHONE}/pause", data={"csrf": _csrf()}, headers=auth())
    assert db.get_lead(PHONE)["data"]["_human_until"] > time.time()
    c.post(f"/admin/chats/{PHONE}/resume", data={"csrf": _csrf()}, headers=auth())
    assert db.get_lead(PHONE)["data"]["_human_until"] == 0


def test_invalid_phone_rejected(setup):
    c, _, _ = setup
    assert c.get("/admin/chats/abc", headers=auth()).status_code == 404


def test_customer_window_parses_sqlite_and_postgres_times():
    now = datetime(2026, 10, 30, 12, 0, tzinfo=timezone.utc)
    assert within_customer_window("2026-10-30 02:00:00", now)                 # SQLite style (UTC)
    assert within_customer_window("2026-10-30 02:00:00.123456+00:00", now)    # Postgres style
    assert not within_customer_window("2026-10-29 11:00:00", now)
    assert not within_customer_window(None, now)
    assert within_customer_window((now - timedelta(hours=23)).isoformat(), now)
