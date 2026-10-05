"""FastAPI app exposing the WhatsApp webhook."""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, Query, Request, Response
from fastapi.responses import HTMLResponse, PlainTextResponse

from . import pages
from .agent import FLOWS_FILE, Agent, build_system_instruction
from .alerts import Alerter, RateLimiter
from .config import settings
from .db import Database
from .flows import Flows
from .scheduling import GoogleCalendar
from .llm import build_chain, build_provider
from .security import verify_signature
from .sheets import LeadSheet
from .whatsapp import IncomingMessage, WhatsAppClient, parse_messages

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("clinic-bot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    missing = settings.missing_required()
    if missing:
        raise RuntimeError(f"Missing required settings: {', '.join(missing)}")
    if not settings.sheets_enabled:
        log.warning("Google Sheets disabled (GOOGLE_SHEET_ID or service account file missing).")
    wa = WhatsAppClient(settings.whatsapp_token, settings.phone_number_id, settings.graph_api_version)
    sheet = (LeadSheet(settings.google_service_account_file, settings.google_sheet_id,
                       settings.google_sheet_tab) if settings.sheets_enabled else None)
    db = Database(settings.database_url or settings.sqlite_path)
    llm = build_chain(settings.llm_chain, settings.llm_keys)
    alerter = Alerter(db, wa, settings.alert_phone, settings.alert_email, settings.smtp_host,
                      settings.smtp_port, settings.smtp_user, settings.smtp_password)
    calendar = None
    if settings.calendar_enabled:
        try:
            calendar = GoogleCalendar(settings.google_service_account_file, settings.google_calendar_id)
        except Exception:
            log.exception("Google Calendar disabled: could not load service account")
    app.state.db, app.state.wa, app.state.llm = db, wa, llm
    app.state.agent = Agent(
        db=db, llm=llm, sender=wa, sheet=sheet,
        history_limit=settings.history_limit, clinic_phone=settings.clinic_phone,
        alerter=alerter if alerter.enabled else None,
        rate_limiter=RateLimiter(settings.rate_limit_count, settings.rate_limit_window),
        flows=Flows(FLOWS_FILE, calendar),
    )
    log.info("Started. LLM chain=%s | DB=%s | Sheets=%s | Calendar=%s | Alerts=%s | Diag=%s",
             [p.name for p in llm.providers], "postgres" if settings.database_url else "sqlite",
             bool(sheet), bool(calendar), alerter.enabled, settings.enable_diag)
    yield
    await wa.aclose()


app = FastAPI(title="Vascular Center WhatsApp Assistant", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/ready")
async def ready(request: Request):
    """Readiness: checks the database connection."""
    ok = request.app.state.db.ping()
    return Response('{"ok":true}' if ok else '{"ok":false}', status_code=200 if ok else 503,
                    media_type="application/json")


def _diag_allowed(token: str) -> bool:
    return settings.enable_diag and bool(token) and token == settings.verify_token


@app.get("/diag/llm")
async def diag_llm(request: Request, token: str = "", entry: str = "", q: str = "namaskar",
                   language: str = "mr"):
    """Test one chain entry (e.g. groq:openai/gpt-oss-120b) or the whole chain with the real prompt.

    Disabled unless ENABLE_DIAG=true; protected by VERIFY_TOKEN; never returns secrets.
    """
    if not _diag_allowed(token):
        return Response(status_code=404)
    import time

    lead = {"data": {}, "profile_name": None, "details_confirmed": False}
    system = build_system_instruction(lead, True, language, q)
    llm = build_provider(entry, settings.llm_keys) if entry else request.app.state.llm
    if llm is None:
        return {"ok": False, "entry": entry, "error": "unknown provider or missing API key"}
    t0 = time.monotonic()
    try:
        turn = await llm.generate(system, [{"role": "user", "content": q}])
    except Exception as exc:
        return {"ok": False, "entry": entry or "chain", "error": f"{type(exc).__name__}: {str(exc)[:400]}"}
    return {"ok": True, "entry": entry or getattr(llm, "last_used", "chain"),
            "ms": int((time.monotonic() - t0) * 1000), "prompt_chars": len(system),
            "turn": turn.model_dump()}


class _CaptureSender:
    def __init__(self):
        self.sent: list[str] = []

    async def send_text(self, to: str, body: str) -> bool:
        self.sent.append(body)
        return True

    async def send_choices(self, to: str, body: str, kind: str, choices: list[dict],
                           button_label: str = "") -> bool:
        self.sent.append(body + f"\n[{kind}: " + " | ".join(c["title"] for c in choices) + "]")
        return True


@app.get("/diag/chat")
async def diag_chat(request: Request, q: str, session: str = "default", token: str = "",
                    choice: str = ""):
    """Try the agent without WhatsApp. Disabled unless ENABLE_DIAG=true; protected by VERIFY_TOKEN."""
    if not _diag_allowed(token):
        return Response(status_code=404)
    real: Agent = request.app.state.agent
    capture = _CaptureSender()
    agent = Agent(db=real.db, llm=real.llm, sender=capture, sheet=None,
                  history_limit=real.history_limit, clinic_phone=real.clinic_phone, flows=real.flows)
    phone = f"diag-{session}"
    await agent.handle(IncomingMessage(f"diag-{session}-{len(q)}-{id(capture)}", phone, "text", q, None,
                                       choice or None))
    return {"reply": capture.sent, "lead": real.db.get_lead(phone),
            "llm": getattr(real.llm, "last_used", None)}


@app.get("/admin/insights", response_class=HTMLResponse)
async def insights(request: Request, token: str = ""):
    """Which messages the menu answered vs. which needed the LLM. Protected by VERIFY_TOKEN."""
    if not token or token != settings.verify_token:
        return Response(status_code=404)
    import html

    db: Database = request.app.state.db
    counts = db.route_counts()
    total = sum(c["n"] for c in counts) or 1
    llm_n = sum(c["n"] for c in counts if c["route"] == "llm")
    rows = "".join(f"<tr><td>{html.escape(c['route'])}</td><td>{c['n']}</td>"
                   f"<td>{100 * c['n'] // total}%</td></tr>" for c in counts)
    qs = "".join(f"<tr><td>{html.escape(e['created_at'][:16])}</td><td>…{html.escape(e['phone'][-4:])}</td>"
                 f"<td>{html.escape(e['detail'] or '')}</td></tr>" for e in db.recent_events("llm", 200))
    return pages.insights_page(total, llm_n, rows, qs)


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
