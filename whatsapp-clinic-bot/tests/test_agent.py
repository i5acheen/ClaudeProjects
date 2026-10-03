import asyncio

from app.agent import Agent, merge_lead
from app.db import Database
from app.llm import AgentTurn, LeadInfo
from app.whatsapp import IncomingMessage

from .fakes import FakeLLM, FakeSender, FakeSheet


def text(mid, body, phone="919000000001"):
    return IncomingMessage(mid, phone, "text", body, "Ramesh")


def make(turns=None, error=None, limit=15):
    db, llm, sender, sheet = Database(":memory:"), FakeLLM(turns, error), FakeSender(), FakeSheet()
    return Agent(db, llm, sender, sheet, history_limit=limit, clinic_phone="+91 1"), db, llm, sender, sheet


def run(coro):
    return asyncio.run(coro)


def test_first_reply_flag_and_history():
    agent, db, llm, sender, _ = make()
    run(agent.handle(text("m1", "namaskar")))
    run(agent.handle(text("m2", "mala payat dukhta")))
    assert '"first_reply": true' in llm.calls[0][0]
    assert '"first_reply": false' in llm.calls[1][0]
    assert [m["role"] for m in llm.calls[1][1]] == ["user", "assistant", "user"]
    assert len(sender.sent) == 2


def test_history_is_limited():
    agent, db, llm, *_ = make(limit=15)
    for i in range(20):
        run(agent.handle(text(f"m{i}", f"msg {i}")))
    history = llm.calls[-1][1]
    assert len(history) == 15
    assert history[-1] == {"role": "user", "content": "msg 19"}


def test_lead_is_merged_saved_and_synced():
    turns = [
        AgentTurn(reply="नाव?", language="mr",
                  lead=LeadInfo(concern="varicose veins", status="Warm")),
        AgentTurn(reply="धन्यवाद", language="mr",
                  lead=LeadInfo(name="Ramesh", preferred_time="Saturday morning", status="Hot")),
    ]
    agent, db, llm, sender, sheet = make(turns)
    run(agent.handle(text("m1", "veins problem")))
    run(agent.handle(text("m2", "Ramesh, shanivari sakali")))
    lead = db.get_lead("919000000001")
    assert lead["data"]["concern"] == "varicose veins"  # kept although model dropped it
    assert lead["data"]["name"] == "Ramesh"
    assert lead["data"]["status"] == "Hot"
    assert lead["language"] == "mr"
    assert len(sheet.rows) == 2
    assert '"concern": "varicose veins"' in llm.calls[1][0]  # known details passed to the model


def test_non_text_message_asks_for_text_without_llm():
    agent, db, llm, sender, _ = make()
    run(agent.handle(IncomingMessage("m1", "919000000001", "audio", None, None)))
    assert llm.calls == []
    assert "टेक्स्ट" in sender.sent[0][1] and "text" in sender.sent[0][1]


def test_llm_failure_sends_fallback():
    agent, db, llm, sender, sheet = make(error=RuntimeError("quota"))
    run(agent.handle(text("m1", "hello")))
    assert "+91 1" in sender.sent[0][1]
    assert sheet.rows == []


def test_merge_lead_ignores_blank_values():
    merged = merge_lead({"name": "A", "city": None}, {"name": "  ", "city": "Jalna", "concern": None})
    assert merged["name"] == "A" and merged["city"] == "Jalna" and merged.get("concern") is None
