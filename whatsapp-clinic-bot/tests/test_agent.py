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


def test_gemini_falls_back_to_next_model_on_overload():
    from google.genai import errors

    from app.llm import GeminiLLM

    llm = GeminiLLM("test-key", "busy-model", ["good-model"])
    calls = []

    class FakeModels:
        async def generate_content(self, model, contents, config):
            calls.append(model)
            if model == "busy-model":
                raise errors.ServerError(503, {"error": {"code": 503, "message": "high demand",
                                                         "status": "UNAVAILABLE"}})

            class R:
                parsed = AgentTurn(reply="ok", language="en", lead=LeadInfo())
                text = ""
            return R()

    llm._client = type("C", (), {"aio": type("A", (), {"models": FakeModels()})()})()
    turn = run(llm.generate("sys", [{"role": "user", "content": "hi"}]))
    assert turn.reply == "ok" and calls == ["busy-model", "good-model"]


def test_format_for_whatsapp_splits_long_paragraphs_only():
    from app.agent import format_for_whatsapp

    short = "नमस्कार! कसे आहात?"
    assert format_for_whatsapp(short) == short
    long = ("हा पहिला वाक्य आहे आणि तो बराच मोठा आहे. " * 3) + "पहा https://www.youtube.com/@x. तुमचे नाव काय?"
    out = format_for_whatsapp(long)
    assert "\n" in out and "https://www.youtube.com/@x." in out
    assert format_for_whatsapp("line one\nline two " + "x" * 200).count("\n") == 1


def test_format_keeps_doctor_title_together():
    from app.agent import format_for_whatsapp

    text = ("नमस्कार 🙏 डॉ. अमोल लाहोटी यांच्या क्लिनिकमध्ये आपलं स्वागत आहे. "
            "सरांनी 5000+ रुग्णांवर उपचार केले आहेत आणि त्यांना 9+ वर्षांचा अनुभव आहे. "
            "Dr. Lahoti helps. तुम्हाला कोणता त्रास होत आहे?")
    out = format_for_whatsapp(text)
    assert "डॉ. अमोल" in out and "Dr. Lahoti" in out and out.count("\n") == 3
