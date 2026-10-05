import json

from fastapi.testclient import TestClient

from app.db import Database
from app.main import app

from .fakes import FakeSender
from .test_security import sign


class RecordingAgent:
    def __init__(self):
        self.handled = []

    async def handle(self, msg):
        self.handled.append(msg)


def client():
    app.state.db = Database(":memory:")
    app.state.wa = FakeSender()
    app.state.agent = RecordingAgent()
    return TestClient(app)  # no context manager → lifespan (real clients) not started


def payload(messages=None, statuses=None):
    value = {"messaging_product": "whatsapp",
             "contacts": [{"wa_id": "919000000001", "profile": {"name": "Ramesh"}}]}
    if messages is not None:
        value["messages"] = messages
    if statuses is not None:
        value["statuses"] = statuses
    return {"object": "whatsapp_business_account",
            "entry": [{"id": "1", "changes": [{"field": "messages", "value": value}]}]}


def post(c, body: dict, secret="test-secret"):
    raw = json.dumps(body).encode()
    return c.post("/webhook", content=raw,
                  headers={"X-Hub-Signature-256": sign(raw, secret), "Content-Type": "application/json"})


def text_msg(mid="wamid.1", body="namaskar"):
    return {"from": "919000000001", "id": mid, "timestamp": "1", "type": "text", "text": {"body": body}}


def test_verify_ok():
    c = client()
    r = c.get("/webhook", params={"hub.mode": "subscribe", "hub.verify_token": "verify-me",
                                  "hub.challenge": "42"})
    assert r.status_code == 200 and r.text == "42"


def test_verify_wrong_token():
    c = client()
    r = c.get("/webhook", params={"hub.mode": "subscribe", "hub.verify_token": "nope",
                                  "hub.challenge": "42"})
    assert r.status_code == 403


def test_bad_signature_rejected():
    c = client()
    assert post(c, payload([text_msg()]), secret="wrong").status_code == 403
    assert app.state.agent.handled == []


def test_text_message_processed_once():
    c = client()
    assert post(c, payload([text_msg()])).status_code == 200
    assert post(c, payload([text_msg()])).status_code == 200  # Meta retry
    handled = app.state.agent.handled
    assert len(handled) == 1
    assert handled[0].text == "namaskar" and handled[0].profile_name == "Ramesh"
    assert app.state.wa.read == ["wamid.1"]


def test_status_updates_ignored():
    c = client()
    r = post(c, payload(statuses=[{"id": "wamid.9", "status": "delivered"}]))
    assert r.status_code == 200
    assert app.state.agent.handled == []


def test_image_passed_through_as_non_text():
    c = client()
    post(c, payload([{"from": "919000000001", "id": "wamid.2", "type": "image", "image": {}}]))
    assert app.state.agent.handled[0].type == "image"
    assert app.state.agent.handled[0].text is None


def test_public_pages():
    c = client()
    for path, text in [("/", "WhatsApp Assistant"), ("/privacy", "Privacy Policy"),
                       ("/data-deletion", "Data Deletion")]:
        r = c.get(path)
        assert r.status_code == 200 and text in r.text
    assert c.head("/").status_code == 200


def test_button_tap_is_parsed_as_text_with_choice_id():
    c = client()
    post(c, payload([{"from": "919000000001", "id": "wamid.3", "type": "interactive",
                      "interactive": {"type": "button_reply",
                                      "button_reply": {"id": "lang_en", "title": "English"}}}]))
    m = app.state.agent.handled[0]
    assert m.type == "text" and m.text == "English" and m.choice_id == "lang_en"


def test_diag_disabled_by_default_and_ready_endpoint():
    c = client()
    assert c.get("/diag/chat", params={"q": "hi", "token": "verify-me"}).status_code == 404
    assert c.get("/diag/llm", params={"token": "verify-me"}).status_code == 404
    r = c.get("/ready")
    assert r.status_code == 200 and r.json() == {"ok": True}


def test_staff_echo_webhook_is_routed():
    from app.whatsapp import parse_staff_echoes

    class EchoAgent(RecordingAgent):
        def __init__(self):
            super().__init__()
            self.echoes = []

        async def staff_replied(self, customer, text):
            self.echoes.append((customer, text))

    c = client()
    app.state.agent = EchoAgent()
    body = {"object": "whatsapp_business_account", "entry": [{"id": "1", "changes": [{
        "field": "smb_message_echoes",
        "value": {"messaging_product": "whatsapp", "message_echoes": [{
            "from": "15556383099", "to": "919000000001", "id": "wamid.E1", "timestamp": "1",
            "type": "text", "text": {"body": "Hi, this is the clinic"}}]}}]}]}
    assert post(c, body).status_code == 200
    assert post(c, body).status_code == 200                       # duplicate ignored
    assert app.state.agent.echoes == [("919000000001", "Hi, this is the clinic")]
    assert app.state.agent.handled == []
    assert parse_staff_echoes({"object": "x"}) == []
