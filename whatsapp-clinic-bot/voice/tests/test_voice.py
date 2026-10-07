import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agent_config import load_agent, load_prompts, recipient_data  # noqa: E402
import server  # noqa: E402

IST = timezone(timedelta(hours=5, minutes=30))


def test_agent_config_is_valid_for_bolna_engine():
    from bolna.models import AgentModel

    for provider in ("plivo", "default"):
        cfg = load_agent(provider)
        model = AgentModel(**cfg)
        tools = model.tasks[0].tools_config
        assert tools.input.provider == provider and tools.output.provider == provider
        assert tools.transcriber.provider == "sarvam" and tools.transcriber.language == "mr-IN"
        assert tools.synthesizer.provider_config.language == "mr-IN"
        assert "{{patient_name}}" in model.agent_welcome_message
        assert "मोफत" in model.agent_welcome_message          # free treatment is in the first sentence


def test_prompt_has_variables_and_safety_rules():
    prompt = load_prompts()["task_1"]["system_prompt"]
    for var in ("{{patient_name}}", "{{concern}}", "{{call_reason}}"):
        assert var in prompt
    assert "108" in prompt and "रोबोट" in prompt and "पात्र" in prompt


def test_prompt_renders_with_bolna():
    from bolna.helpers.utils import update_prompt_with_context

    out = update_prompt_with_context(load_prompts()["task_1"]["system_prompt"],
                                     {"recipient_data": recipient_data("रमेश", "पाय सुजणे", "test")})
    assert "रमेश" in out and "{{patient_name}}" not in out


def test_env_overrides(monkeypatch):
    monkeypatch.setenv("VOICE_LLM_MODEL", "gemini-x")
    monkeypatch.setenv("VOICE_TTS_VOICE", "Priya")
    tools = load_agent()["tasks"][0]["tools_config"]
    assert tools["llm_agent"]["llm_config"]["model"] == "gemini-x"
    assert tools["synthesizer"]["provider_config"]["voice_id"] == "priya"


def test_calling_hours():
    day = datetime(2026, 10, 7, tzinfo=IST)
    assert not server.within_calling_hours(day.replace(hour=8, minute=59))
    assert server.within_calling_hours(day.replace(hour=9))
    assert server.within_calling_hours(day.replace(hour=19, minute=59))
    assert not server.within_calling_hours(day.replace(hour=20))


def test_answer_xml():
    xml = server.answer_xml("wss://x.example/ws/plivo/abc")
    assert '<Stream bidirectional="true" keepCallAlive="true">wss://x.example/ws/plivo/abc</Stream>' in xml


def _post(path, **kw):
    import httpx

    async def go():
        transport = httpx.ASGITransport(app=server.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
            return await c.post(path, **kw)
    return asyncio.run(go())


def test_calls_requires_token(monkeypatch):
    monkeypatch.setenv("VOICE_API_TOKEN", "secret-token")
    assert _post("/calls", json={"phone": "919999999999"}).status_code == 403
    assert _post("/calls", json={"phone": "919999999999"}, headers={"X-Voice-Token": "bad"}).status_code == 403


def test_calls_blocked_outside_hours(monkeypatch):
    monkeypatch.setenv("VOICE_API_TOKEN", "secret-token")
    monkeypatch.setenv("ALLOW_CALLS_ANYTIME", "false")
    monkeypatch.setattr(server, "within_calling_hours", lambda now=None: False)
    r = _post("/calls", json={"phone": "919999999999"}, headers={"X-Voice-Token": "secret-token"})
    assert r.status_code == 409


def test_unknown_call_key_hangs_up(monkeypatch):
    monkeypatch.setenv("PUBLIC_URL", "https://voice.example")
    r = _post("/plivo/answer/unknown")
    assert "<Hangup/>" in r.text


def test_known_call_key_streams_to_websocket(monkeypatch):
    monkeypatch.setenv("PUBLIC_URL", "https://voice.example")
    server._pending["k1"] = {"data": recipient_data("x"), "phone": "91", "ts": 9e18}
    r = _post("/plivo/answer/k1")
    assert "wss://voice.example/ws/plivo/k1" in r.text
    server._pending.pop("k1", None)


def test_mic_test_disabled_by_default(monkeypatch):
    monkeypatch.delenv("ENABLE_MIC_TEST", raising=False)

    class FakeWS:
        closed = accepted = False
        async def accept(self): self.accepted = True
        async def close(self): self.closed = True

    ws = FakeWS()
    asyncio.run(server.mic_test(ws, "neha"))
    assert ws.accepted and ws.closed


def test_unknown_websocket_key_closes():
    class FakeWS:
        closed = False
        async def accept(self): pass
        async def close(self): self.closed = True

    ws = FakeWS()
    asyncio.run(server.plivo_stream(ws, "nope"))
    assert ws.closed


def test_no_conversation_outcome_and_report(tmp_path, monkeypatch):
    monkeypatch.setattr(server, "CALL_LOG", tmp_path / "calls.jsonl")
    monkeypatch.delenv("RESULT_WEBHOOK_URL", raising=False)
    result = asyncio.run(server.report_call("919999999999", recipient_data("x"),
                                            [{"role": "assistant", "content": "नमस्कार"}], 12.3))
    assert result["extracted"]["outcome"] == "no_conversation"
    assert (tmp_path / "calls.jsonl").read_text(encoding="utf-8").count("\n") == 1


def test_signature():
    assert server.sign(b"abc", "s") == server.sign(b"abc", "s") != server.sign(b"abd", "s")
