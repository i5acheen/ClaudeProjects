"""Same behaviour on SQLite and Postgres. Postgres runs only if TEST_DATABASE_URL is set."""
import os

import pytest

from app.db import Database

TARGETS = [":memory:"] + ([os.environ["TEST_DATABASE_URL"]] if os.environ.get("TEST_DATABASE_URL") else [])


@pytest.mark.parametrize("target", TARGETS)
def test_database_operations(target):
    db = Database(target)
    phone = f"91{abs(hash(target)) % 10**10:010d}"
    assert db.mark_processed(f"m-{phone}") is True
    assert db.mark_processed(f"m-{phone}") is False
    assert db.recent_messages(phone, 5) == []
    db.add_message(phone, "user", "नमस्कार")
    db.add_message(phone, "assistant", "hello")
    db.add_message(phone, "user", "q2")
    assert [m["content"] for m in db.recent_messages(phone, 2)] == ["hello", "q2"]
    assert db.has_assistant_replied(phone)
    assert db.get_lead(phone)["first_seen"] is None
    db.save_lead(phone, {"name": "A"}, None, "Prof", False)
    db.save_lead(phone, {"name": "A", "city": "Jalna"}, "mr", None, True)
    db.save_lead(phone, {"name": "A", "city": "Jalna"}, None, None, False)
    lead = db.get_lead(phone)
    assert lead["data"]["city"] == "Jalna" and lead["language"] == "mr"
    assert lead["profile_name"] == "Prof" and lead["details_confirmed"] is True
    assert lead["first_seen"]
    assert db.ping()
