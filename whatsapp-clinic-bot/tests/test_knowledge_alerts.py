import asyncio
from pathlib import Path

from app.alerts import Alerter, RateLimiter
from app.db import Database
from app.knowledge import select_knowledge

from .fakes import FakeSender

KNOWLEDGE = (Path(__file__).resolve().parent.parent / "knowledge" / "clinic_info.md").read_text()


def test_knowledge_always_has_core_and_adds_relevant_sections():
    base = select_knowledge(KNOWLEDGE, "namaskar")
    assert "Century Multispeciality Hospital" in base and "maps.google.com" in base
    assert "### 3.1 Varicose" in base          # main specialty when nothing specific asked
    assert "### 3.5 Deep Vein" not in base
    assert len(base) < len(KNOWLEDGE) * 0.75
    dvt = select_knowledge(KNOWLEDGE, "mala DVT ahe, clot zala")
    assert "### 3.5 Deep Vein" in dvt and "### 3.1 Varicose" not in dvt
    dialysis = select_knowledge(KNOWLEDGE, "डायलिसिस fistula problem")
    assert "### 3.7 Other services" in dialysis
    cost = select_knowledge(KNOWLEDGE, "kharch kiti yeil? sarkari yojana?")
    assert "## 4. Frequently asked" in cost


def test_rate_limiter():
    rl = RateLimiter(count=3, window=60)
    assert [rl.allow("p", now=t) for t in (0, 1, 2, 3)] == [True, True, True, False]
    assert rl.allow("other", now=3)
    assert rl.allow("p", now=70)


def test_alerts_are_sent_once_per_lead_and_kind():
    db, sender = Database(":memory:"), FakeSender()
    alerter = Alerter(db, sender, alert_phone="+91 99999 00000")
    lead = {"phone": "919000000001", "profile_name": "R",
            "data": {"name": "Ramesh", "concern": "varicose veins", "status": "Hot"}}
    asyncio.run(alerter.lead_event(lead, "hot"))
    asyncio.run(alerter.lead_event(lead, "hot"))
    asyncio.run(alerter.lead_event(lead, "confirmed"))
    assert [to for to, *_ in sender.sent] == ["919999900000", "919999900000"]
    assert "Ramesh" in sender.sent[0][1] and "Hot lead" in sender.sent[0][1]


def test_alerter_disabled_without_targets():
    assert not Alerter(Database(":memory:"), FakeSender()).enabled
