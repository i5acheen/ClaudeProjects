import json
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
        assert len(FLOWS.t(it.get("description"), lang)) <= 72
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


def test_first_message_asks_which_disease_in_marathi_then_shows_its_info():
    agent, db, llm, sender = make(language=None)
    run(agent.handle(say("m1", "hi")))
    assert llm.calls == []
    to, body, kind, titles = sender.sent[-1]
    assert kind == "list" and "कोणता त्रास" in body and "आयुष्मान" in body
    assert titles == ["🦵 व्हेरिकोज व्हेन्स", "व्हॅरिकोसील", "🦴 स्पाइन (मणका) त्रास", "❓ इतर त्रास"]
    assert db.get_lead(PHONE)["language"] == "mr"
    run(agent.handle(tap("m2", "f:concern:varicose")))
    to, body, kind, titles = sender.sent[-1]
    assert "25 मिनिटात" in body and kind == "list" and len(titles) == 6 and len(body) <= 1024
    assert db.get_lead(PHONE)["data"]["concern"] == "varicose veins"
    run(agent.handle(tap("m3", "f:m:disease")))                 # choose another problem
    run(agent.handle(tap("m4", "f:concern:spine")))
    assert "साईटिका" in sender.sent[-1][1] and "कॅशलेस" in sender.sent[-1][1]
    run(agent.handle(tap("m5", "f:concern:varicocele")))
    assert "अंडकोषात" in sender.sent[-1][1] and "मोफत सल्ला" in sender.sent[-1][1]
    run(agent.handle(say("m6", "Hindi")))                       # asked to switch: same info, in Hindi
    assert "अंडकोष में" in sender.sent[-1][1] and db.get_lead(PHONE)["language"] == "hi"
    assert llm.calls == []


def test_other_problem_is_typed_then_noted():
    agent, db, llm, sender = make()
    run(agent.handle(tap("m1", "f:concern:other")))
    assert "टाइप करा" in sender.sent[-1][1]
    run(agent.handle(say("m2", "गुडघेदुखी आहे")))
    assert "नोंदवला" in sender.sent[-1][1] and sender.sent[-1][2] == "list"
    assert db.get_lead(PHONE)["data"]["concern"] == "other: गुडघेदुखी आहे" and llm.calls == []


def test_booking_asks_only_for_the_date():
    agent, db, llm, sender = make()
    run(agent.handle(tap("m1", "f:m:book")))
    to, body, kind, titles = sender.sent[-1]
    assert kind == "list" and "दिवस निवडा" in body and titles[-1] == "📞 आधी कॉल करा"
    day = [t for t in titles if t != "📞 आधी कॉल करा"][0]
    first_day_id = None
    from app.flows import Flows  # noqa: F401
    free = run(FLOWS.scheduler.free_slots())
    first_day_id = list(free)[0].isoformat()
    run(agent.handle(tap("m2", f"f:date:{first_day_id}", day)))
    body = sender.sent[-1][1]
    assert "नोंदवली" in body and "प्रतिनिधी" in body and day in body   # done, no more questions
    lead = db.get_lead(PHONE)
    assert lead["details_confirmed"] and lead["data"]["status"] == "Hot" and lead["data"]["_day"] == first_day_id
    assert llm.calls == []
    run(agent.handle(tap("m3", "f:m:book")))                   # a second request starts fresh
    assert sender.sent[-1][2] == "list" and "दिवस निवडा" in sender.sent[-1][1]


def test_booking_call_me_first():
    agent, db, llm, sender = make()
    run(agent.handle(tap("m1", "f:m:book")))
    run(agent.handle(tap("m2", "f:time:call_first")))
    assert "लवकरच कॉल" in sender.sent[-1][1] and db.get_lead(PHONE)["details_confirmed"]


def test_fixed_answers_and_free_text_goes_to_llm_and_is_logged():
    agent, db, llm, sender = make()
    run(agent.handle(tap("m1", "f:m:location")))               # old taps still answered safely
    assert "प्रतिनिधी" in sender.sent[-1][1] and "maps" not in sender.sent[-1][1] and llm.calls == []
    run(agent.handle(tap("m2", "f:m:other")))
    run(agent.handle(say("m3", "Mala sugar ahe, laser karta yeil ka?")))
    assert len(llm.calls) == 1
    assert sender.sent[-1][2] == "buttons"                      # menu offered after LLM answer
    counts = {c["route"]: c["n"] for c in db.route_counts()}
    assert counts["answer:location"] == 1 and counts["llm"] == 1
    assert db.recent_events("llm")[0]["detail"].startswith("Mala sugar")


def test_callback_is_one_tap_and_menu_word():
    agent, db, llm, sender = make()
    run(agent.handle(tap("m1", "f:m:callback")))
    assert "प्रतिनिधी" in sender.sent[-1][1] and "कॉल" in sender.sent[-1][1]
    lead = db.get_lead(PHONE)
    assert lead["details_confirmed"] and lead["data"]["status"] == "Hot"
    run(agent.handle(say("m4", "menu")))
    assert sender.sent[-1][2] == "list" and llm.calls == []


def test_photo_is_saved_acknowledged_once_and_marks_lead_hot():
    agent, db, llm, sender = make()
    run(agent.handle(IncomingMessage("p1", PHONE, "image", "left leg", "Ramesh", None, None, "MEDIA123")))
    run(agent.handle(IncomingMessage("p2", PHONE, "image", None, "Ramesh", None, None, "MEDIA124")))
    acks = [m for m in sender.sent if "मिळाला" in m[1]]
    assert len(acks) == 1                                       # one thank-you per burst
    conv = db.conversation(PHONE)
    assert conv[0]["content"] == "[photo:MEDIA123] left leg" and conv[-1]["content"].startswith("[photo:MEDIA124]")
    assert db.get_lead(PHONE)["data"]["status"] == "Hot" and llm.calls == []


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


def test_date_request_adds_tentative_calendar_entry():
    from app.flows import Flows

    cal = FakeCalendar()
    flows = Flows(FLOWS_FILE, cal)
    db, llm, sender = Database(":memory:"), FakeLLM(), FakeSender()
    db.save_lead(PHONE, {"name": "Sunita"}, "en", None, False)
    agent = Agent(db, llm, sender, None, flows=flows)
    run(agent.handle(tap("m1", "f:m:book")))
    to, body, kind, titles = sender.sent[-1]
    assert kind == "list" and "Pick a day" in body and titles[-1] == "📞 Call me first"
    assert all(len(t) <= 24 for t in titles)
    day = list(run(flows.scheduler.free_slots()))[0]
    run(agent.handle(tap("m2", f"f:date:{day.isoformat()}")))
    assert len(cal.events) == 1 and "Sunita" in cal.events[0][1] and "time to be fixed" in cal.events[0][1]
    assert PHONE in cal.events[0][2] and cal.events[0][0].date() == day
    assert "representative will call" in sender.sent[-1][1]
    assert db.get_lead(PHONE)["data"]["_event"] == "evt1"


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


def test_staff_reply_from_business_app_pauses_bot():
    agent, db, llm, sender = make()
    run(agent.staff_replied(PHONE, "Namaskar, me clinic madhun bolte"))
    run(agent.handle(say("m1", "kiti vajta yeu?")))
    assert sender.sent == [] and llm.calls == []                 # bot stays quiet
    hist = db.recent_messages(PHONE, 5)
    assert hist[0]["content"].startswith("[Clinic staff]") and hist[-1]["content"] == "kiti vajta yeu?"
    assert {c["route"] for c in db.route_counts()} >= {"staff_reply", "human"}
    # after the handoff window, the bot answers again
    lead = db.get_lead(PHONE)
    db.save_lead(PHONE, lead["data"] | {"_human_until": 0}, "mr", None, False)
    run(agent.handle(say("m2", "menu")))
    assert sender.sent and sender.sent[-1][2] == "list"


def test_scheme_flow_tags_lead_and_goes_to_booking():
    agent, db, llm, sender = make()
    run(agent.handle(tap("m1", "f:m:scheme")))
    to, body, kind, titles = sender.sent[-1]
    assert "मोफत" in body and kind == "buttons" and titles[0] == "✅ कार्ड आहे"
    run(agent.handle(tap("m2", "f:scheme:card")))
    body = sender.sent[-1][1]
    assert "आधार" in body and sender.sent[-1][2] == "list"          # docs + concern list
    assert db.get_lead(PHONE)["data"]["scheme"] == "has scheme card"
    assert llm.calls == []


def test_followups_sent_once_each_inside_24h_and_not_after_booking():
    import time as _t

    agent, db, llm, sender = make()
    run(agent.handle(say("m1", "menu")))
    sent_before = len(sender.sent)
    last = db.get_lead(PHONE)["data"]["_last_user_ts"]
    assert run(agent.send_followups(now=last + 3600)) == 0              # too early
    assert run(agent.send_followups(now=last + 2.5 * 3600)) == 1        # first reminder
    assert "नमस्कार" in sender.sent[-1][1] and sender.sent[-1][2] == "buttons"
    assert run(agent.send_followups(now=last + 3 * 3600)) == 0          # not twice
    assert run(agent.send_followups(now=last + 21 * 3600)) == 1         # second reminder
    assert run(agent.send_followups(now=last + 22 * 3600)) == 0         # none left
    assert len(sender.sent) == sent_before + 2
    # a reply resets the clock; outside 24h nothing is sent
    run(agent.handle(say("m2", "menu")))
    last2 = db.get_lead(PHONE)["data"]["_last_user_ts"]
    assert run(agent.send_followups(now=last2 + 25 * 3600)) == 0
    # confirmed bookings never get reminders
    lead = db.get_lead(PHONE)
    db.save_lead(PHONE, lead["data"], "mr", None, True)
    assert run(agent.send_followups(now=last2 + 3 * 3600)) == 0


def test_ad_referral_is_stored_once():
    agent, db, llm, sender = make()
    m = IncomingMessage("m1", PHONE, "text", "Hi", "R", None, "Free varicose vein treatment | ad | 1234")
    run(agent.handle(m))
    run(agent.handle(IncomingMessage("m2", PHONE, "text", "menu", "R", None, "Other ad")))
    assert db.get_lead(PHONE)["data"]["_ad"] == "Free varicose vein treatment | ad | 1234"
    assert any(c["route"] == "ad_click" for c in db.route_counts())


def test_menu_only_mode_without_ai():
    db, sender = Database(":memory:"), FakeSender()
    db.save_lead(PHONE, {}, "mr", None, False)
    agent = Agent(db, None, sender, None, flows=FLOWS, clinic_phone="+91 96995 59301")
    run(agent.handle(say("m1", "mala sugar ahe, laser hoil ka?")))
    to, body, kind, titles = sender.sent[-1]
    assert kind == "list" and len(titles) == 6                       # the main menu
    assert "प्रतिनिधी" in body and "नोंदवला" in body and "96995" not in body
    assert db.recent_events("no_ai")[0]["detail"].startswith("mala sugar")
    run(agent.handle(tap("m2", "f:m:cost")))                         # menu still works
    assert "खर्च" in sender.sent[-1][1]


def test_emergency_words_answered_instantly_without_llm():
    agent, db, llm, sender = make()
    run(agent.handle(say("m1", "achanak shwas ghyayla tras hotoy ani paay suzla")))
    assert "108" in sender.sent[-1][1] and llm.calls == []
    lead = db.get_lead(PHONE)
    assert lead["data"]["status"] == "Hot" and "EMERGENCY" in lead["data"]["summary"]
    assert any(c["route"] == "emergency" for c in db.route_counts())
    # works in menu-only mode too, and in Hindi
    db2, s2 = Database(":memory:"), FakeSender()
    db2.save_lead(PHONE, {}, "hi", None, False)
    run(Agent(db2, None, s2, None, flows=FLOWS).handle(say("m1", "छाती में दर्द हो रहा है")))
    assert "तुरंत 108" in s2.sent[-1][1]


def test_settings_do_not_require_ai_keys():
    from app.config import load_settings

    s = load_settings()
    object.__setattr__(s, "llm_keys", {"openrouter": "", "groq": "", "cerebras": "", "gemini": ""})
    assert not any("API_KEY" in m for m in s.missing_required())


def test_workflow_is_standard_no_names_or_videos():
    """Patient-facing workflow text must not reveal doctor, hospital, location or phone, or offer videos."""
    import yaml

    texts = yaml.safe_load(FLOWS.path.read_text(encoding="utf-8"))
    flat = json.dumps(texts, ensure_ascii=False).lower()
    for banned in ("lahoti", "लाहोटी", "century", "सेंच्युरी", "सेंचुरी", "youtube", "video", "व्हिडिओ",
                   "वीडियो", "dramollahoti", "vascular center", "व्हॅस्कुलर सेंटर", "ajinkya", "maps.google",
                   "96995", "88057", "kotwalpura", "कोतवालपुरा", "bus stand", "बस स्टँड", "{phone}"):
        assert banned not in flat, banned
    ids = [it["id"] for it in texts["menu"]["items"]]
    assert ids == ["book", "form", "photo", "callback", "disease", "other"]
    assert [c["id"] for c in texts["concerns"]] == ["varicose", "varicocele", "spine", "other"]


@pytest.mark.parametrize("lang", ["mr", "hi", "en"])
def test_location_question_promises_a_call(lang):
    r = FLOWS.answer("location", lang)
    assert "📞" in r.text and not any(ch.isdigit() for ch in r.text)
    assert r.choices[0]["id"] == "f:go:call"


def test_chat_form_asks_name_age_location_disease():
    agent, db, llm, sender = make()
    run(agent.handle(tap("m1", "f:m:form")))
    assert "नाव" in sender.sent[-1][1]
    run(agent.handle(say("m2", "Sunita Patil")))
    assert "वय" in sender.sent[-1][1]
    run(agent.handle(say("m3", "abc")))                          # not an age -> not taken as one
    assert db.get_lead(PHONE)["data"].get("age") is None
    run(agent.handle(say("m4", "45 वर्ष")))
    assert "गाव" in sender.sent[-1][1]
    run(agent.handle(say("m5", "Jalna")))
    to, body, kind, titles = sender.sent[-1]
    assert kind == "list" and "कोणता त्रास" in body             # disease picker inside the form
    run(agent.handle(tap("m6", "f:concern:spine")))
    body = sender.sent[-1][1]
    assert "नोंदवली" in body and "Sunita Patil" in body and "45" in body and "Jalna" in body and "स्पाइन" in body
    lead = db.get_lead(PHONE)
    d = lead["data"]
    assert (d["name"], d["age"], d["city"], d["concern"]) == ("Sunita Patil", "45", "Jalna", "spine problem")
    assert lead["details_confirmed"] and d["status"] == "Hot"


def test_chat_form_skips_known_disease():
    agent, db, llm, sender = make()
    db.save_lead(PHONE, {"concern": "varicocele"}, "mr", None, False)
    run(agent.handle(tap("m1", "f:m:form")))
    run(agent.handle(say("m2", "Ramesh")))
    run(agent.handle(say("m3", "30")))
    run(agent.handle(say("m4", "Paithan")))
    assert "नोंदवली" in sender.sent[-1][1] and "व्हॅरिकोसील" in sender.sent[-1][1]


def test_native_form_sent_and_answers_saved():
    from app.flows import Flows

    class FlowSender(FakeSender):
        async def send_flow(self, to, body, flow_id, cta):
            self.sent.append((to, body, "flow", [flow_id, cta]))
            return True

    flows = Flows(FLOWS_FILE, None, form_flow_id="123456")
    db, sender = Database(":memory:"), FlowSender()
    db.save_lead(PHONE, {}, "mr", None, False)
    agent = Agent(db, FakeLLM(), sender, None, flows=flows)
    run(agent.handle(tap("m1", "f:m:form")))
    assert sender.sent[-1][2] == "flow" and sender.sent[-1][3] == ["123456", "फॉर्म भरा"]
    answers = '{"name": "Asha", "age": "52", "location": "Vaijapur", "disease": "varicose"}'
    run(agent.handle(IncomingMessage("m2", PHONE, "text", answers, None, "f:formdata")))
    d = db.get_lead(PHONE)["data"]
    assert (d["name"], d["age"], d["city"], d["concern"]) == ("Asha", "52", "Vaijapur", "varicose veins")
    assert "नोंदवली" in sender.sent[-1][1]


def test_native_form_falls_back_to_chat_form():
    from app.flows import Flows

    class FailingFlowSender(FakeSender):
        async def send_flow(self, to, body, flow_id, cta):
            return False

    flows = Flows(FLOWS_FILE, None, form_flow_id="bad-id")
    db, sender = Database(":memory:"), FailingFlowSender()
    db.save_lead(PHONE, {}, "mr", None, False)
    agent = Agent(db, FakeLLM(), sender, None, flows=flows)
    run(agent.handle(tap("m1", "f:m:form")))
    assert "नाव" in sender.sent[-1][1] and db.get_lead(PHONE)["data"]["_step"] == "name"
    run(agent.handle(say("m2", "Asha")))
    assert "वय" in sender.sent[-1][1]


def test_parse_native_form_reply():
    from app.whatsapp import parse_messages
    payload = {"object": "whatsapp_business_account", "entry": [{"changes": [{"value": {
        "contacts": [{"wa_id": PHONE, "profile": {"name": "R"}}],
        "messages": [{"id": "w1", "from": PHONE, "type": "interactive", "interactive": {
            "type": "nfm_reply", "nfm_reply": {"name": "flow", "body": "Sent",
                                               "response_json": '{"name": "Asha", "flow_token": "x"}'}}}]}}]}]}
    m = parse_messages(payload)[0]
    assert m.choice_id == "f:formdata" and '"Asha"' in m.text and m.type == "text"
