"""FastAPI app exposing the WhatsApp webhook."""

from __future__ import annotations

import asyncio
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
from .security import verify_signature, verify_url_key
from .sheets import LeadSheet
from .whatsapp import IncomingMessage, WhatsAppClient, parse_messages, parse_staff_echoes

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
    wa = WhatsAppClient(settings.whatsapp_token, settings.phone_number_id, settings.graph_api_version,
                        settings.whatsapp_api_url, settings.whatsapp_auth_header)
    sheet = (LeadSheet(settings.google_service_account_file, settings.google_sheet_id,
                       settings.google_sheet_tab) if settings.sheets_enabled else None)
    db = Database(settings.database_url or settings.sqlite_path)
    try:
        llm = build_chain(settings.llm_chain, settings.llm_keys)
    except RuntimeError:
        llm = None  # no AI key: menu-only mode
        log.warning("No AI key set: running menu-only. Typed questions get the menu + clinic number.")
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
        human_handoff_hours=settings.human_handoff_hours,
    )
    log.info("Started. LLM chain=%s | DB=%s | Sheets=%s | Calendar=%s | Alerts=%s | Diag=%s",
             ([p.name for p in llm.providers] if llm else "OFF (menu-only)"), "postgres" if settings.database_url else "sqlite",
             bool(sheet), bool(calendar), alerter.enabled, settings.enable_diag)
    async def followup_loop():
        while True:
            await asyncio.sleep(600)  # every 10 minutes
            try:
                await app.state.agent.send_followups()
            except Exception:
                log.exception("Follow-up run failed")

    task = asyncio.create_task(followup_loop()) if settings.followups_enabled else None
    yield
    if task:
        task.cancel()
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
    if llm is None and not entry:
        return {"ok": False, "error": "AI is off (no AI key set)"}
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
    llm_n = sum(c["n"] for c in counts if c["route"] in ("llm", "no_ai"))
    rows = "".join(f"<tr><td>{html.escape(c['route'])}</td><td>{c['n']}</td>"
                   f"<td>{100 * c['n'] // total}%</td></tr>" for c in counts)
    qs = "".join(f"<tr><td>{html.escape(e['created_at'][:16])}</td><td>…{html.escape(e['phone'][-4:])}</td>"
                 f"<td>{html.escape(e['detail'] or '')}</td></tr>" for e in sorted(db.recent_events("llm", 200) + db.recent_events("no_ai", 200),
                                   key=lambda e: e["created_at"], reverse=True)[:200])
    return pages.insights_page(total, llm_n, rows, qs)


# ---------------------------------------------------------------- staff inbox (/admin/chats)

def _inbox_auth(request: Request) -> Response | None:
    """HTTP Basic login (username "admin", password ADMIN_PASSWORD). Returns an error response or None."""
    password = settings.admin_password
    if not password:
        return Response(status_code=404)            # inbox switched off
    import base64
    import hmac

    header = request.headers.get("Authorization", "")
    if header.startswith("Basic "):
        try:
            user, _, given = base64.b64decode(header[6:]).decode("utf-8").partition(":")
        except Exception:
            user, given = "", ""
        if hmac.compare_digest(user, "admin") and hmac.compare_digest(given.encode(), password.encode()):
            return None
    return Response("Login required", status_code=401,
                    headers={"WWW-Authenticate": 'Basic realm="Clinic inbox", charset="UTF-8"'})


def _inbox_csrf() -> str:
    import hashlib
    import hmac

    return hmac.new(settings.admin_password.encode(), b"inbox-csrf", hashlib.sha256).hexdigest()


async def _inbox_form(request: Request) -> dict | None:
    """Parse a posted form and check its CSRF token (blocks forged posts from other sites)."""
    import hmac
    from urllib.parse import parse_qs

    raw = (await request.body()).decode("utf-8", "replace")
    form = {k: v[0] for k, v in parse_qs(raw).items()}
    if not hmac.compare_digest(form.get("csrf", ""), _inbox_csrf()):
        return None
    return form


def _valid_phone(phone: str) -> bool:
    return phone.isdigit() and 8 <= len(phone) <= 15


def _redirect(phone: str, flash: str = "") -> Response:
    from urllib.parse import quote

    return Response(status_code=303, headers={"Location": f"/admin/chats/{phone}"
                                              + (f"?m={quote(flash)}" if flash else "")})


@app.get("/admin/chats", response_class=HTMLResponse)
async def inbox_list(request: Request):
    if (denied := _inbox_auth(request)) is not None:
        return denied
    import time as _time

    return pages.chats_list_page(request.app.state.db.list_conversations(), _time.time())


@app.get("/admin/chats/{phone}", response_class=HTMLResponse)
async def inbox_chat(request: Request, phone: str, m: str = ""):
    if (denied := _inbox_auth(request)) is not None:
        return denied
    if not _valid_phone(phone):
        return Response(status_code=404)
    import time as _time
    from .agent import within_customer_window

    db: Database = request.app.state.db
    lead = db.get_lead(phone)
    flashes = {"sent": "Sent ✓ The bot is paused for this patient.",
               "window_closed": "Not sent: more than 24 hours since the patient's last message.",
               "send_failed": "Not sent: WhatsApp rejected the message. Check the server logs.",
               "empty": "Type a message first.", "paused": "Bot paused. Staff are handling this chat.",
               "resumed": "Bot resumed for this patient."}
    return pages.chat_page(phone, lead, db.conversation(phone),
                           can_reply=within_customer_window(db.last_user_message_at(phone)),
                           paused=(lead["data"].get("_human_until") or 0) > _time.time(),
                           csrf=_inbox_csrf(), flash=flashes.get(m, ""))


@app.post("/admin/chats/{phone}/reply")
async def inbox_reply(request: Request, phone: str):
    if (denied := _inbox_auth(request)) is not None:
        return denied
    form = await _inbox_form(request)
    if form is None or not _valid_phone(phone):
        return Response(status_code=403)
    ok, reason = await request.app.state.agent.staff_send(phone, form.get("text", "")[:4000])
    return _redirect(phone, reason)


@app.post("/admin/chats/{phone}/pause")
async def inbox_pause(request: Request, phone: str):
    if (denied := _inbox_auth(request)) is not None:
        return denied
    if await _inbox_form(request) is None or not _valid_phone(phone):
        return Response(status_code=403)
    await request.app.state.agent.set_bot_paused(phone, True)
    return _redirect(phone, "paused")


@app.post("/admin/chats/{phone}/resume")
async def inbox_resume(request: Request, phone: str):
    if (denied := _inbox_auth(request)) is not None:
        return denied
    if await _inbox_form(request) is None or not _valid_phone(phone):
        return Response(status_code=403)
    await request.app.state.agent.set_bot_paused(phone, False)
    return _redirect(phone, "resumed")


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
    signed = verify_signature(raw, request.headers.get("X-Hub-Signature-256"), settings.app_secret)
    if not signed and not verify_url_key(request.query_params.get("key"), settings.webhook_url_key):
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

    for echo in parse_staff_echoes(payload):     # coexistence: staff replied from the Business app
        if db.mark_processed(echo.message_id):
            background.add_task(request.app.state.agent.staff_replied, echo.customer, echo.text)

    return Response(status_code=200)             # respond fast; work happens in background
