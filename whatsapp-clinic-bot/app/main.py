"""FastAPI app exposing the WhatsApp webhook."""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, Query, Request, Response
from fastapi.responses import HTMLResponse, PlainTextResponse

from . import pages
from .agent import Agent
from .config import settings
from .db import Database
from .llm import GeminiLLM
from .security import verify_signature
from .sheets import LeadSheet
from .whatsapp import WhatsAppClient, parse_messages

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("clinic-bot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    missing = settings.missing_required()
    if missing:
        raise RuntimeError(f"Missing required settings in .env: {', '.join(missing)}")
    if not settings.sheets_enabled:
        log.warning("Google Sheets disabled (GOOGLE_SHEET_ID or service account file missing). "
                    "Leads are still saved in SQLite.")
    wa = WhatsAppClient(settings.whatsapp_token, settings.phone_number_id, settings.graph_api_version)
    sheet = (LeadSheet(settings.google_service_account_file, settings.google_sheet_id,
                       settings.google_sheet_tab) if settings.sheets_enabled else None)
    app.state.db = Database(settings.sqlite_path)
    app.state.wa = wa
    app.state.agent = Agent(
        db=app.state.db,
        llm=GeminiLLM(settings.gemini_api_key, settings.gemini_model),
        sender=wa,
        sheet=sheet,
        history_limit=settings.history_limit,
        clinic_phone=settings.clinic_phone,
    )
    log.info("Started. Model=%s, Sheets=%s", settings.gemini_model, bool(sheet))
    yield
    await wa.aclose()


app = FastAPI(title="Vascular Center WhatsApp Assistant", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/diag/gemini")
async def diag_gemini(token: str = ""):
    """Test the Gemini connection. Protected by VERIFY_TOKEN; never returns secrets."""
    if not token or token != settings.verify_token:
        return Response(status_code=403)
    from google import genai

    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        resp = await client.aio.models.generate_content(model=settings.gemini_model, contents="Say OK")
        return {"ok": True, "model": settings.gemini_model, "reply": (resp.text or "")[:50]}
    except Exception as exc:  # report the error type/message to help debugging
        return {"ok": False, "model": settings.gemini_model,
                "key_prefix": settings.gemini_api_key[:3],
                "error": f"{type(exc).__name__}: {str(exc)[:600]}"}


@app.api_route("/", methods=["GET", "HEAD"], response_class=HTMLResponse)
async def home():
    return pages.HOME


@app.get("/privacy", response_class=HTMLResponse)
async def privacy():
    return pages.PRIVACY


@app.get("/data-deletion", response_class=HTMLResponse)
async def data_deletion():
    return pages.DATA_DELETION


@app.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query("", alias="hub.mode"),
    hub_verify_token: str = Query("", alias="hub.verify_token"),
    hub_challenge: str = Query("", alias="hub.challenge"),
):
    if hub_mode == "subscribe" and hub_verify_token and hub_verify_token == settings.verify_token:
        return PlainTextResponse(hub_challenge)
    return Response(status_code=403)


@app.post("/webhook")
async def receive_webhook(request: Request, background: BackgroundTasks):
    raw = await request.body()
    if not verify_signature(raw, request.headers.get("X-Hub-Signature-256"), settings.app_secret):
        log.warning("Rejected webhook with invalid signature")
        return Response(status_code=403)

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return Response(status_code=200)
    if not isinstance(payload, dict):
        return Response(status_code=200)

    db: Database = request.app.state.db
    messages = parse_messages(payload)
    log.info("Webhook received: %d message(s)", len(messages))
    for msg in messages:          # status updates produce no messages
        if not db.mark_processed(msg.message_id):  # Meta retries → skip duplicates
            log.info("Duplicate message %s ignored", msg.message_id)
            continue
        background.add_task(request.app.state.wa.mark_read, msg.message_id)
        background.add_task(request.app.state.agent.handle, msg)

    return Response(status_code=200)             # respond fast; work happens in background
