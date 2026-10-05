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
