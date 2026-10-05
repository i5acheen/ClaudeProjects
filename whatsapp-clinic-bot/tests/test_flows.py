import asyncio

import pytest

from app.agent import FLOWS_FILE, Agent
from app.db import Database
from app.flows import Flows, looks_like_answer
from app.whatsapp import IncomingMessage

from .fakes import FakeLLM, FakeSender

PHONE = "919000000001"
FLOWS = Flows(FLOWS_FILE)


def run(coro):
    return asyncio.run(coro)


def make(language="mr"):
    db, llm, sender = Database(":memory:"), FakeLLM(), FakeSender()
    if language:
        db.save_lead(PHONE, {}, language, None, False)
    return Agent(db, llm, sender, None, flows=FLOWS), db, llm, sender


def tap(mid, choice_id, title="x"):
    return IncomingMessage(mid, PHONE, "text", title, "Ramesh", choice_id)


def say(mid, text):
    return IncomingMessage(mid, PHONE, "text", text, "Ramesh")


@pytest.mark.parametrize("lang", ["mr", "hi", "en"])
def test_all_titles_fit_whatsapp_limits(lang):
    c = FLOWS.c
    for it in c["menu"]["items"]:
        assert len(FLOWS.t(it["title"], lang)) <= 24, it["title"]
        assert len(FLOWS.t(it["description"], lang)) <= 72
    for section in ("concerns", "times"):
        for x in c[section]:
            assert len(FLOWS.t(x["title"], lang)) <= 24, x["title"]
    for x in c["durations"]:
        assert len(FLOWS.t(x["title"], lang)) <= 20, x["title"]
    for b in c["buttons"].values():
        assert len(FLOWS.t(b, lang)) <= 20, b
    assert len(c["menu"]["items"]) <= 10
    for a in c["answers"].values():
        assert FLOWS.t(a["text"], lang) and len(a.get("next", [])) <= 3


def test_language_pick_shows_welcome_menu_without_llm():
    agent, db, llm, sender = make(language=None)
    run(agent.handle(say("m1", "hi")))
    run(agent.handle(tap("m2", "lang_mr", "मराठी")))
    assert llm.calls == []
    to, body, kind, titles = sender.sent[-1]
    assert kind == "list" and "1000+" in body and len(titles) == 9


def test_full_booking_flow_without_llm():
    agent, db, llm, sender = make()
    run(agent.handle(tap("m1", "f:m:book")))
    assert sender.sent[-1][2] == "list"                         # concern list
    run(agent.handle(tap("m2", "f:concern:varicose")))
    assert sender.sent[-1][2] == "buttons"                      # info + duration buttons
    assert "व्हेरिकोज" in sender.sent[-1][1]
    run(agent.handle(tap("m3", "f:dur:gt2y")))
    run(agent.handle(say("m4", "ok")))                          # filler is not a name -> LLM
    assert len(llm.calls) == 1
    run(agent.handle(say("m5", "Sunita Patil")))                # typed name
    run(agent.handle(say("m6", "Jalna")))                       # typed city
    run(agent.handle(tap("m7", "f:time:tom_am")))
    body = sender.sent[-1][1]
    assert "Sunita Patil" in body and "Jalna" in body and "उद्या सकाळी" in body
    run(agent.handle(tap("m8", "f:confirm:yes")))
    lead = db.get_lead(PHONE)
    assert lead["details_confirmed"] and lead["data"]["status"] == "Hot"
    assert lead["data"]["concern"] == "varicose veins" and lead["data"]["preferred_time"] == "tomorrow morning"
    assert lead["data"]["name"] == "Sunita Patil" and lead["data"]["city"] == "Jalna"
    assert len(llm.calls) == 1                                  # only the stray "ok" used the LLM


def test_fixed_answers_and_free_text_goes_to_llm_and_is_logged():
    agent, db, llm, sender = make()
    run(agent.handle(tap("m1", "f:m:location")))
    assert "maps.google.com" in sender.sent[-1][1] and llm.calls == []
    run(agent.handle(tap("m2", "f:m:other")))
    run(agent.handle(say("m3", "Mala sugar ahe, laser karta yeil ka?")))
    assert len(llm.calls) == 1
    assert sender.sent[-1][2] == "buttons"                      # menu offered after LLM answer
    counts = {c["route"]: c["n"] for c in db.route_counts()}
    assert counts["answer:location"] == 1 and counts["llm"] == 1
    assert db.recent_events("llm")[0]["detail"].startswith("Mala sugar")


def test_callback_flow_and_menu_word():
    agent, db, llm, sender = make()
    run(agent.handle(tap("m1", "f:m:callback")))
    run(agent.handle(say("m2", "Ramesh")))
    run(agent.handle(tap("m3", "f:time:call_first")))
    assert sender.sent[-1][3] == ["✅ बरोबर आहे", "✏️ बदला"]
    run(agent.handle(say("m4", "menu")))
    assert sender.sent[-1][2] == "list" and llm.calls == []


def test_typed_answer_rules():
    assert looks_like_answer("Sunita", "name") and not looks_like_answer("ok", "name")
    assert looks_like_answer("2 varsha", "duration") and not looks_like_answer("Sunita", "duration")
    assert looks_like_answer("udya sakali", "preferred_time")
    assert not looks_like_answer("laser kiti kharch yeil?", "city")


def test_insights_page_requires_token():
    from fastapi.testclient import TestClient

    from app.main import app

    app.state.db = Database(":memory:")
    app.state.db.log_event(PHONE, "llm", "sugar ahe")
    c = TestClient(app)
    assert c.get("/admin/insights").status_code == 404
    r = c.get("/admin/insights", params={"token": "verify-me"})
    assert r.status_code == 200 and "sugar ahe" in r.text


class FakeCalendar:
    def __init__(self, busy=None):
        self.busy_ranges = list(busy or [])
        self.events = []

    async def busy(self, start, end):
        return list(self.busy_ranges)

    async def create_event(self, start, end, summary, description):
        self.events.append((start, summary, description))
        self.busy_ranges.append((start, end))
        return f"evt{len(self.events)}"


def test_calendar_date_and_slot_booking_creates_tentative_event():
    from datetime import date, datetime, timedelta

    from app.flows import Flows

    cal = FakeCalendar()
    flows = Flows(FLOWS_FILE, cal)
    db, llm, sender = Database(":memory:"), FakeLLM(), FakeSender()
    db.save_lead(PHONE, {"concern": "varicose veins", "duration": "more than 2 years",
                         "name": "Sunita", "city": "Jalna"}, "en", None, False)
    agent = Agent(db, llm, sender, None, flows=flows)
    run(agent.handle(tap("m1", "f:m:book")))
    to, body, kind, titles = sender.sent[-1]
    assert kind == "list" and "Which day" in body and titles[-1] == "📞 Call me first"
    assert all(len(t) <= 24 for t in titles)
    # pick the first offered day, then a session/slot
    free = run(flows.scheduler.free_slots())
    day = list(free)[0]
    run(agent.handle(tap("m2", f"f:date:{day.isoformat()}")))
    kind = sender.sent[-1][2]
    if kind == "buttons":  # morning/evening
        sid = free[day][0][0]
        run(agent.handle(tap("m3", f"f:sess:{day.isoformat()}:{sid}")))
    assert sender.sent[-1][2] == "list"
    slot = free[day][0][1]
    run(agent.handle(tap("m4", f"f:slot:{slot.isoformat()}")))
    assert "Please check" in sender.sent[-1][1]
    run(agent.handle(tap("m5", "f:confirm:yes")))
    assert len(cal.events) == 1 and "Sunita" in cal.events[0][1] and PHONE in cal.events[0][2]
    assert "added to the clinic's calendar" in sender.sent[-1][1]
    lead = db.get_lead(PHONE)
    assert lead["details_confirmed"] and lead["data"]["_slot"] == slot.isoformat()
    # the same slot is now busy for the next patient
    assert not run(flows.scheduler.is_free(slot))


def test_taken_slot_asks_to_choose_again():
    from datetime import timedelta

    from app.flows import Flows

    flows = Flows(FLOWS_FILE, FakeCalendar())
    free = run(flows.scheduler.free_slots())
    day = list(free)[0]
    slot = free[day][0][1]
    cal = FakeCalendar(busy=[(slot, slot + timedelta(minutes=30))])
    flows = Flows(FLOWS_FILE, cal)
    db, sender = Database(":memory:"), FakeSender()
    db.save_lead(PHONE, {"concern": "leg pain", "duration": "less than 6 months", "name": "A",
                         "city": "B", "_flow": "book"}, "mr", None, False)
    agent = Agent(db, FakeLLM(), sender, None, flows=flows)
    run(agent.handle(tap("m1", f"f:slot:{slot.isoformat()}")))
    assert "नुकतीच बुक" in sender.sent[-1][1] and sender.sent[-1][2] == "list"


def test_scheduler_respects_hours_notice_and_closed_days():
    from datetime import datetime
    from zoneinfo import ZoneInfo

    from app.scheduling import Scheduler

    cfg = {"timezone": "Asia/Kolkata", "days_ahead": 7, "open_days": ["mon", "tue", "wed", "thu", "fri", "sat"],
           "closed_dates": ["2026-10-07"], "slot_minutes": 30, "min_notice_minutes": 120,
           "sessions": [{"id": "am", "start": "10:00", "end": "13:00"}, {"id": "pm", "start": "17:00", "end": "20:00"}]}
    s = Scheduler(cfg)
    now = datetime(2026, 10, 5, 11, 15, tzinfo=ZoneInfo("Asia/Kolkata"))   # Monday 11:15
    free = run(s.free_slots(now=now))
    today = free[now.date()]
    assert today[0][1].strftime("%H:%M") == "17:00"          # morning gone (2h notice)
    assert all(d.weekday() != 6 for d in free)                # no Sundays
    assert datetime(2026, 10, 7).date() not in free           # holiday
    assert len(free[datetime(2026, 10, 6).date()]) == 12      # 6 + 6 slots
    assert s.day_label(datetime(2026, 10, 6).date(), "mr", today=now.date()).startswith("उद्या")
