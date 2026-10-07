"""Neha voice agent server, built on the open-source Bolna engine (github.com/bolna-ai/bolna).

Endpoints:
  GET  /health                       liveness check
  POST /calls                        place an outbound call (needs header X-Voice-Token)
  POST /plivo/answer/{key}           Plivo asks what to do when the patient picks up -> stream audio to us
  POST /plivo/hangup/{key}           Plivo call-ended callback
  WS   /ws/plivo/{key}               live call audio (Plivo <-> Bolna engine)
  WS   /chat/v1/{agent_id}           laptop-microphone test (use Bolna's local_setup/quickstart_client.py)

Secrets come only from environment variables (.env); see .env.example.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from agent_config import AGENT_ID, load_agent, load_prompts, recipient_data, use_gemini_for_helper_llms

load_dotenv()
use_gemini_for_helper_llms()
log = logging.getLogger("neha-voice")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

IST = timezone(timedelta(hours=5, minutes=30))
CALL_START_HOUR = int(os.getenv("CALL_START_HOUR", "9"))    # never call before 9am IST
CALL_END_HOUR = int(os.getenv("CALL_END_HOUR", "20"))       # ...or after 8pm IST
PENDING_TTL = 600                                            # seconds a placed call may take to connect
CALL_LOG = Path(os.getenv("CALL_LOG_FILE", Path(__file__).resolve().parent / "data" / "calls.jsonl"))

app = FastAPI(title="Neha voice agent")
_pending: dict[str, dict] = {}   # call key -> {"data": recipient_data, "phone": ..., "ts": ...}


# --------------------------------------------------------------------------- helpers

def within_calling_hours(now: datetime | None = None) -> bool:
    now = (now or datetime.now(IST)).astimezone(IST)
    return CALL_START_HOUR <= now.hour < CALL_END_HOUR


def _check_token(token: str | None) -> None:
    expected = os.getenv("VOICE_API_TOKEN", "")
    if not expected or not token or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=403, detail="invalid token")


def _public_url() -> str:
    url = os.getenv("PUBLIC_URL", "").rstrip("/")
    if not url.startswith("https://"):
        raise HTTPException(status_code=500, detail="PUBLIC_URL (https://...) is not set")
    return url


def _expire_pending(now: float | None = None) -> None:
    now = now or time.time()
    for key in [k for k, v in _pending.items() if now - v["ts"] > PENDING_TTL]:
        _pending.pop(key, None)


def answer_xml(ws_url: str) -> str:
    """Plivo XML: open a two-way audio stream to our websocket (same as Bolna's own Plivo server)."""
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n'
            f'    <Stream bidirectional="true" keepCallAlive="true">{ws_url}</Stream>\n'
            '</Response>')


# --------------------------------------------------------------------------- HTTP

class CallRequest(BaseModel):
    phone: str = Field(..., description="Patient number with country code, e.g. 919876543210")
    patient_name: str = ""
    concern: str = ""
    call_reason: str = ""
    lead_ref: str = ""   # e.g. the WhatsApp number / lead id, echoed back in the result webhook


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.post("/calls")
async def place_call(req: CallRequest, x_voice_token: str | None = Header(None)) -> dict:
    """Place an outbound call. Only call patients who agreed to a call (consent is checked by the caller)."""
    _check_token(x_voice_token)
    if not within_calling_hours() and os.getenv("ALLOW_CALLS_ANYTIME", "false").lower() != "true":
        raise HTTPException(status_code=409, detail=f"outside calling hours ({CALL_START_HOUR}:00-{CALL_END_HOUR}:00 IST)")
    phone = "".join(ch for ch in req.phone if ch.isdigit())
    if len(phone) < 10:
        raise HTTPException(status_code=422, detail="invalid phone")

    import plivo  # imported here so tests and the mic test don't need Plivo credentials

    _expire_pending()
    key = secrets.token_urlsafe(24)
    _pending[key] = {"data": recipient_data(req.patient_name, req.concern, req.call_reason,
                                            lead_ref=req.lead_ref or phone),
                     "phone": phone, "ts": time.time()}
    base = _public_url()
    client = plivo.RestClient(os.environ["PLIVO_AUTH_ID"], os.environ["PLIVO_AUTH_TOKEN"])
    try:
        resp = await asyncio.to_thread(
            client.calls.create,
            from_=os.environ["PLIVO_PHONE_NUMBER"], to_=phone,
            answer_url=f"{base}/plivo/answer/{key}", answer_method="POST",
            hangup_url=f"{base}/plivo/hangup/{key}", hangup_method="POST",
        )
    except Exception as exc:
        _pending.pop(key, None)
        log.exception("Plivo call failed")
        raise HTTPException(status_code=502, detail=f"telephony error: {type(exc).__name__}")
    log.info("Call placed to …%s (key …%s)", phone[-4:], key[-4:])
    return {"ok": True, "call_key": key, "request_uuid": getattr(resp, "request_uuid", None)}


@app.post("/plivo/answer/{key}")
async def plivo_answer(key: str, request: Request):
    if key not in _pending:
        return PlainTextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>',
                                 media_type="text/xml")
    ws_url = _public_url().replace("https://", "wss://") + f"/ws/plivo/{key}"
    return PlainTextResponse(answer_xml(ws_url), media_type="text/xml")


@app.post("/plivo/hangup/{key}")
async def plivo_hangup(key: str, request: Request):
    _pending.pop(key, None)   # unanswered / busy calls never reach the websocket
    return PlainTextResponse("", status_code=200)


# --------------------------------------------------------------------------- live calls

async def _run_call(websocket: WebSocket, io_provider: str, data: dict) -> list[dict]:
    from bolna.agent_manager.assistant_manager import AssistantManager

    manager = AssistantManager(load_agent(io_provider), websocket, AGENT_ID,
                               context_data={"recipient_data": data},
                               prompt_responses=load_prompts())
    messages: list[dict] = []
    try:
        async for _, output in manager.run(local=True):
            messages = output.get("messages") or messages
    except WebSocketDisconnect:
        pass
    return messages


@app.websocket("/ws/plivo/{key}")
async def plivo_stream(websocket: WebSocket, key: str):
    pending = _pending.pop(key, None)
    await websocket.accept()
    if not pending:
        await websocket.close()
        return
    started = time.time()
    messages = await _run_call(websocket, "plivo", pending["data"])
    await report_call(pending["phone"], pending["data"], messages, time.time() - started)


@app.websocket("/chat/v1/{agent_id}")
async def mic_test(websocket: WebSocket, agent_id: str):
    """Laptop-microphone test with Bolna's quickstart_client.py. Disabled unless ENABLE_MIC_TEST=true."""
    await websocket.accept()
    if os.getenv("ENABLE_MIC_TEST", "false").lower() != "true":
        await websocket.close()
        return
    data = recipient_data(os.getenv("TEST_PATIENT_NAME", "सचिन"))
    started = time.time()
    messages = await _run_call(websocket, "default", data)
    await report_call("mic-test", data, messages, time.time() - started)


# --------------------------------------------------------------------------- after the call

EXTRACTION_PROMPT = """You read a phone call transcript between "Neha" (clinic assistant) and a patient.
Return ONLY JSON with these keys:
outcome: one of booked_visit, interested_callback, not_interested, do_not_call, wrong_number, busy_call_later, emergency_advised, no_conversation
preferred_day_time: string or null (as the patient said it)
has_scheme_card: one of yes, no, not_sure, null
problem_duration: string or null
callback_time: string or null
questions_unanswered: string or null (questions Neha could not answer)
summary: one short English sentence for the clinic team."""


async def extract_outcome(messages: list[dict]) -> dict:
    turns = [m for m in messages if m.get("role") in ("user", "assistant") and m.get("content")]
    if not any(m["role"] == "user" for m in turns):
        return {"outcome": "no_conversation", "summary": "Patient did not speak / call not answered."}
    transcript = "\n".join(f"{'Patient' if m['role'] == 'user' else 'Neha'}: {m['content']}" for m in turns)
    key = os.getenv("GOOGLE_API_KEY", "")
    if not key:
        return {"outcome": None, "summary": "No GOOGLE_API_KEY for extraction."}
    try:
        from google import genai

        client = genai.Client(api_key=key)
        resp = await client.aio.models.generate_content(
            model=os.getenv("VOICE_EXTRACTION_MODEL", "gemini-3.5-flash-lite"),
            contents=transcript,
            config={"system_instruction": EXTRACTION_PROMPT, "response_mime_type": "application/json",
                    "temperature": 0},
        )
        return json.loads(resp.text)
    except Exception as exc:
        log.warning("Outcome extraction failed: %s", exc)
        return {"outcome": None, "summary": "Extraction failed; read the transcript."}


def sign(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


async def report_call(phone: str, data: dict, messages: list[dict], seconds: float) -> dict:
    """Save the call result locally and POST it to the WhatsApp bot (RESULT_WEBHOOK_URL), signed with HMAC."""
    result = {
        "phone": phone,
        "lead_ref": data.get("lead_ref", phone),
        "patient_name": data.get("patient_name"),
        "duration_seconds": round(seconds),
        "ended_at": datetime.now(IST).isoformat(timespec="seconds"),
        "extracted": await extract_outcome(messages),
        "transcript": [{"role": m.get("role"), "content": m.get("content")} for m in messages
                       if m.get("role") in ("user", "assistant")],
    }
    try:
        CALL_LOG.parent.mkdir(parents=True, exist_ok=True)
        with CALL_LOG.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(result, ensure_ascii=False) + "\n")
    except OSError:
        log.exception("Could not write call log")
    url, secret = os.getenv("RESULT_WEBHOOK_URL", ""), os.getenv("RESULT_WEBHOOK_SECRET", "")
    if url and secret:
        body = json.dumps(result, ensure_ascii=False).encode()
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                await client.post(url, content=body, headers={"Content-Type": "application/json",
                                                             "X-Signature-256": "sha256=" + sign(body, secret)})
        except httpx.HTTPError as exc:
            log.warning("Result webhook failed: %s", exc)
    log.info("Call …%s finished: %s", str(phone)[-4:], result["extracted"].get("outcome"))
    return result
