"""Conversation orchestration: history → Gemini → reply + lead update."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Protocol

from .db import LEAD_FIELDS, Database
from .flows import Flows, FlowReply, is_greeting
from .knowledge import select_knowledge
from .llm import AgentTurn
from .whatsapp import IncomingMessage

log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
PROMPT_FILE = BASE_DIR / "prompts" / "system_prompt.md"
KNOWLEDGE_FILE = BASE_DIR / "knowledge" / "clinic_info.md"
FLOWS_FILE = BASE_DIR / "knowledge" / "flows.yaml"

# Sent without calling the LLM: in the chosen language, or all three if not chosen yet.
NON_TEXT_REPLY = {
    "mr": "क्षमस्व, मी सध्या फक्त टेक्स्ट मेसेज वाचू शकतो. कृपया तुमचा प्रश्न टाइप करून पाठवा. 🙏",
    "hi": "क्षमा करें, मैं अभी केवल टेक्स्ट मैसेज पढ़ सकता हूँ. कृपया अपना सवाल टाइप करके भेजें. 🙏",
    "en": "Sorry, I can only read text messages right now. Please type your question. 🙏",
}


PHOTO_ACK_MARK = "📷 "   # prefix on the stored "photo received" reply (not sent to the patient)


class LLM(Protocol):
    async def generate(self, system_instruction: str, history: list[dict]) -> AgentTurn: ...


class Sender(Protocol):
    async def send_text(self, to: str, body: str) -> bool: ...

    async def send_choices(self, to: str, body: str, kind: str, choices: list[dict],
                           button_label: str = "") -> bool: ...


LANGUAGE_CHOICES = [
    {"id": "lang_mr", "title": "मराठी"},
    {"id": "lang_hi", "title": "हिंदी"},
    {"id": "lang_en", "title": "English"},
]
LANGUAGE_NAMES = {"mr": "Marathi (मराठी)", "hi": "Hindi (हिंदी)", "en": "English"}
_LANGUAGE_WORDS = {
    "mr": ("marathi", "मराठी"),
    "hi": ("hindi", "हिंदी", "हिन्दी"),
    "en": ("english", "इंग्रजी", "अंग्रेजी", "इंग्लिश"),
}
DEFAULT_LANGUAGE = "mr"   # everyone starts in Marathi; switch only when they ask


def detect_language_choice(msg: IncomingMessage) -> str | None:
    """Return 'mr'/'hi'/'en' if the person asks for a language: a language button, the language's
    name on its own ("Hindi"), or a short request naming it ("hindi me baat karo", "reply in English")."""
    if msg.choice_id and msg.choice_id.startswith("lang_"):
        return msg.choice_id.removeprefix("lang_")
    if msg.choice_id:
        return None
    text = (msg.text or "").strip().lower().strip(".!?")
    if not text or len(text.split()) > 6:
        return None
    found = [code for code, words in _LANGUAGE_WORDS.items() if any(w in text for w in words)]
    return found[0] if len(found) == 1 else None


def mentions_language(text: str, code: str) -> bool:
    """True if the user explicitly names a language, e.g. 'please reply in English'."""
    t = text.lower()
    return any(w in t for w in _LANGUAGE_WORDS[code] if not w.isdigit())




class Sheet(Protocol):
    async def upsert(self, lead: dict) -> None: ...


def build_system_instruction(lead: dict, first_reply: bool, language: str | None = None,
                             query: str = "") -> str:
    # Read on every call so edits to the .md files apply without restarting.
    prompt = PROMPT_FILE.read_text(encoding="utf-8")
    knowledge = select_knowledge(KNOWLEDGE_FILE.read_text(encoding="utf-8"), query)
    context = {
        "first_reply": first_reply,
        "reply_language": LANGUAGE_NAMES.get(language or "", "not chosen yet: detect from their message, default Marathi"),
        "whatsapp_profile_name": lead.get("profile_name"),
        "current_lead_details": {k: lead["data"].get(k) for k in LEAD_FIELDS},
        "details_already_confirmed": lead.get("details_confirmed", False),
    }
    return (
        f"{prompt}\n\n---\n# Clinic knowledge\n{knowledge}\n\n---\n"
        f"# Context for this conversation\n```json\n{json.dumps(context, ensure_ascii=False, indent=2)}\n```"
    )


_ABBREVIATIONS = ("डॉ.", "Dr.", "dr.", "Mr.", "Mrs.", "Ms.", "No.", "St.", "vs.", "सौ.", "श्री.", "कु.")


def format_for_whatsapp(text: str) -> str:
    """Break a long single-paragraph reply into short lines, one sentence per line."""
    text = text.strip()
    if "\n" in text or len(text) < 160:
        return text

    def split(m: re.Match) -> str:
        before = text[:m.start() + 1]
        if before.endswith(_ABBREVIATIONS):  # e.g. "डॉ. अमोल" must stay together
            return m.group(0)
        return m.group(1) + "\n"

    return re.sub(r"([.?!।])\s+(?=\S)", split, text)


def merge_lead(old: dict, new: dict) -> dict:
    """Keep previously collected values if the model drops them; accept new non-empty values."""
    merged = dict(old)
    for k in LEAD_FIELDS:
        v = new.get(k)
        if isinstance(v, str):
            v = v.strip() or None
        if v is not None:
            merged[k] = v
    return merged


def parse_db_time(value: str | None) -> datetime | None:
    """DB timestamps: SQLite gives naive UTC text, Postgres gives aware text. Returns aware UTC."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def within_customer_window(last_user_at: str | None, now: datetime | None = None,
                           hours: float = 23.9) -> bool:
    """WhatsApp allows free-text replies only within 24h of the customer's last message."""
    last = parse_db_time(last_user_at)
    if last is None:
        return False
    now = now or datetime.now(timezone.utc)
    return now - last < timedelta(hours=hours)


class Agent:
    def __init__(self, db: Database, llm: LLM, sender: Sender, sheet: Sheet | None,
                 history_limit: int = 15, clinic_phone: str = "", alerter=None, rate_limiter=None,
                 flows: Flows | None = None, human_handoff_hours: float = 12):
        self.db, self.llm, self.sender, self.sheet = db, llm, sender, sheet
        self.human_handoff_hours = human_handoff_hours
        self.flows = flows
        self.alerter, self.rate_limiter = alerter, rate_limiter
        self.history_limit = history_limit
        self.clinic_phone = clinic_phone
        self._locks: defaultdict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    def fallback_reply(self, language: str | None = None) -> str:
        texts = {
            "mr": "क्षमस्व, सध्या तांत्रिक अडचण आहे. कृपया थोड्या वेळाने पुन्हा मेसेज करा. "
                  "आमचे प्रतिनिधी तुम्हाला कॉल करतील.",
            "hi": "क्षमा करें, अभी तकनीकी समस्या है. कृपया थोड़ी देर बाद फिर से मैसेज करें. "
                  "हमारे प्रतिनिधि आपको कॉल करेंगे.",
            "en": "Sorry, we're facing a technical issue. Please try again shortly. "
                  "Our representative will call you.",
        }
        return texts.get(language or "") or "\n\n".join(texts.values())

    async def handle(self, msg: IncomingMessage) -> None:
        # One message at a time per user, so history and lead state stay consistent.
        async with self._locks[msg.phone]:
            try:
                await self._handle(msg)
            except Exception:
                log.exception("Failed to handle message %s", msg.message_id)

    async def _handle(self, msg: IncomingMessage) -> None:
        log.info("Handling %s message from ...%s", msg.type, msg.phone[-4:])
        if self.rate_limiter and not self.rate_limiter.allow(msg.phone):
            log.warning("Rate limit hit for ...%s, message ignored", msg.phone[-4:])
            return
        lead = self.db.get_lead(msg.phone)
        if msg.ad and not lead["data"].get("_ad"):  # remember which Meta ad brought this person
            self.db.save_lead(msg.phone, lead["data"] | {"_ad": msg.ad}, lead["language"],
                              msg.profile_name, lead["details_confirmed"])
            self.db.log_event(msg.phone, "ad_click", msg.ad)
            lead = self.db.get_lead(msg.phone)
        language = lead.get("language")

        if msg.media_id and msg.type in ("image", "document"):
            await self._photo_received(msg, lead, language or DEFAULT_LANGUAGE)
            return

        if msg.type != "text" or not (msg.text or "").strip():
            reply = NON_TEXT_REPLY.get(language or DEFAULT_LANGUAGE)
            await self.sender.send_text(msg.phone, reply)
            return

        text = msg.text.strip()
        if (lead["data"].get("_human_until") or 0) > time.time():
            # Staff are chatting with this person from the WhatsApp Business app: stay quiet.
            self.db.add_message(msg.phone, "user", text)
            self.db.log_event(msg.phone, "human", text)
            log.info("Staff handling ...%s, bot paused", msg.phone[-4:])
            return
        first_contact = language is None and not self.db.recent_messages(msg.phone, 1)
        chosen = detect_language_choice(msg)
        if chosen and chosen != language:
            # They asked for another language: switch, and show the menu in it.
            language = chosen
            self.db.save_lead(msg.phone, lead["data"], language, msg.profile_name,
                              lead["details_confirmed"])
        elif chosen:
            chosen = None             # already in that language: treat as a normal message
        if language is None:
            language = DEFAULT_LANGUAGE
            self.db.save_lead(msg.phone, lead["data"], language, msg.profile_name,
                              lead["details_confirmed"])

        # 0) Emergency words: answer instantly, with or without AI.
        if self.flows and not msg.choice_id and self.flows.is_emergency(text):
            lang = language or "mr"
            self.db.add_message(msg.phone, "user", text)
            reply_text = self.flows.emergency_text(lang, self.clinic_phone)
            if await self.sender.send_text(msg.phone, reply_text):
                self.db.add_message(msg.phone, "assistant", reply_text)
            self.db.log_event(msg.phone, "emergency", text)
            await self._save(msg, lead, dict(lead["data"]) | {"status": "Hot", "summary": f"EMERGENCY words: {text[:80]}"},
                             language, lead["details_confirmed"])
            return

        # First message (often from an ad): the standard welcome + menu, in Marathi.
        if self.flows and (first_contact or chosen):
            await self._apply_flow(msg, text, self.flows.menu(language, welcome=True), lead, language)
            return

        # 1) Menu / predefined flow first: instant, free, and no risk of invented answers.
        if self.flows and language:
            reply = await self._flow_reply(msg, text, chosen, lead, language)
            if reply:
                await self._apply_flow(msg, text, reply, lead, language)
                return

        # 2) No AI configured: offer the menu and the clinic number, and log the question for the team.
        if self.llm is None:
            if text:
                self.db.add_message(msg.phone, "user", text)
            lang = language or "mr"
            if self.flows:
                reply = self.flows.no_ai(lang, self.clinic_phone)
                if await self._send(msg.phone, reply.text, reply.kind, reply.choices, reply.button_label):
                    self.db.add_message(msg.phone, "assistant", reply.text)
            else:
                await self.sender.send_text(msg.phone, self.fallback_reply(language))
            self.db.log_event(msg.phone, "no_ai", text or "(first message)")
            await self._save(msg, lead, dict(lead["data"]), lang, lead["details_confirmed"])
            return

        # 3) Anything the menu can't handle goes to the LLM.
        if text:
            self.db.add_message(msg.phone, "user", text)
        self.db.log_event(msg.phone, "llm", text or "(answer to first message)")
        first_reply = not self.db.has_assistant_replied(msg.phone)
        history = self.db.recent_messages(msg.phone, self.history_limit)
        lead = self.db.get_lead(msg.phone)
        recent_user = " ".join(m["content"] for m in history if m["role"] == "user")[-600:]
        query = f"{recent_user} {lead['data'].get('concern') or ''}"
        system = build_system_instruction(lead, first_reply, language, query)

        try:
            turn = await self.llm.generate(system, history)
        except Exception as exc:
            log.error("All LLM providers failed: %s", type(exc).__name__)
            await self.sender.send_text(msg.phone, self.fallback_reply(language))
            if self.alerter:
                await self.alerter.bot_failure(msg.phone)
            return

        # Keep the chosen language unless the person explicitly asked to switch.
        if language is None:
            language = turn.language
        elif turn.language != language and mentions_language(text, turn.language):
            language = turn.language

        reply = format_for_whatsapp(turn.reply) or self.fallback_reply(language)
        opts = turn.options
        choices = [c.model_dump() for c in opts.choices if c.id and c.title]
        kind, label = opts.kind, opts.button_label or ""
        if self.flows and (kind == "none" or not choices):
            # Always offer a way back to the menu after a free-text answer.
            kind, choices, label = "buttons", self.flows.buttons(["book", "menu"], language), ""
        if await self._send(msg.phone, reply, kind, choices, label):
            shown = " | ".join(c["title"] for c in choices) if kind != "none" else ""
            self.db.add_message(msg.phone, "assistant", reply + (f"\n[Options shown: {shown}]" if shown else ""))
            log.info("Replied to ...%s via LLM (status=%s, options=%s)", msg.phone[-4:], turn.lead.status, kind)

        new_data = merge_lead(lead["data"], turn.lead.model_dump())
        confirmed = lead["details_confirmed"] or turn.details_confirmed
        await self._save(msg, lead, new_data, language, confirmed)

    async def staff_replied(self, customer: str, text: str | None) -> None:
        """Coexistence: staff answered from the Business app, so pause the bot for this chat."""
        async with self._locks[customer]:
            lead = self.db.get_lead(customer)
            data = dict(lead["data"]) | {"_human_until": time.time() + self.human_handoff_hours * 3600}
            self.db.save_lead(customer, data, lead["language"], None, lead["details_confirmed"])
            self.db.add_message(customer, "assistant", f"[Clinic staff] {text or ''}".strip())
            self.db.log_event(customer, "staff_reply")
            log.info("Staff replied to ...%s from the Business app; bot paused %sh",
                     customer[-4:], self.human_handoff_hours)

    async def _photo_received(self, msg: IncomingMessage, lead: dict, language: str) -> None:
        """Leg photo / Doppler report: save it for staff (inbox), thank the patient once per burst."""
        caption = (msg.text or "").strip()
        self.db.add_message(msg.phone, "user", f"[photo:{msg.media_id}] {caption}".strip())
        self.db.log_event(msg.phone, "photo", caption or msg.type)
        recent = self.db.recent_messages(msg.phone, 4)
        already_thanked = any(m["role"] == "assistant" and m["content"].startswith(PHOTO_ACK_MARK)
                              for m in recent)
        staff_handling = (lead["data"].get("_human_until") or 0) > time.time()
        if self.flows and not already_thanked and not staff_handling:
            reply = self.flows.t(self.flows.c["prompts"]["photo_received"], language)
            btns = self.flows.buttons(["book", "call", "menu"], language)
            if await self._send(msg.phone, reply, "buttons", btns):
                self.db.add_message(msg.phone, "assistant", PHOTO_ACK_MARK + reply)
        data = dict(lead["data"]) | {"status": "Hot", "summary": "sent leg/Doppler photo for doctor's advice"}
        await self._save(msg, lead, data, language, lead["details_confirmed"])

    async def staff_send(self, phone: str, text: str) -> tuple[bool, str]:
        """Reply typed by staff in the /admin/chats inbox. Pauses the bot for this patient.
        Free-text messages are only allowed within 24h of the patient's last message (WhatsApp rule)."""
        text = (text or "").strip()
        if not text:
            return False, "empty"
        async with self._locks[phone]:
            if not within_customer_window(self.db.last_user_message_at(phone)):
                return False, "window_closed"
            if not await self.sender.send_text(phone, text):
                return False, "send_failed"
            lead = self.db.get_lead(phone)
            data = dict(lead["data"]) | {"_human_until": time.time() + self.human_handoff_hours * 3600}
            self.db.save_lead(phone, data, lead["language"], None, lead["details_confirmed"])
            self.db.add_message(phone, "assistant", f"[Clinic staff] {text}")
            self.db.log_event(phone, "staff_reply", "inbox")
            return True, "sent"

    async def set_bot_paused(self, phone: str, paused: bool) -> None:
        """Pause (staff take over) or resume the bot for one patient from the inbox."""
        async with self._locks[phone]:
            lead = self.db.get_lead(phone)
            until = time.time() + self.human_handoff_hours * 3600 if paused else 0
            self.db.save_lead(phone, dict(lead["data"]) | {"_human_until": until}, lead["language"],
                              None, lead["details_confirmed"])
            self.db.log_event(phone, "bot_paused" if paused else "bot_resumed", "inbox")

    async def send_followups(self, now: float | None = None) -> int:
        """Send due reminders to patients who stopped replying. Only inside the free 24-hour
        WhatsApp window, never after a confirmed booking, never while staff handle the chat."""
        if not self.flows:
            return 0
        now = now or time.time()
        sent = 0
        for phone in self.db.unconfirmed_leads():
            async with self._locks[phone]:
                lead = self.db.get_lead(phone)
                d, lang = lead["data"], lead.get("language")
                last = d.get("_last_user_ts")
                n = int(d.get("_followups") or 0)
                due = self.flows.followup_hours(n)
                if (not lang or not last or due is None or lead["details_confirmed"]
                        or d.get("status") == "Cold" or (d.get("_human_until") or 0) > now):
                    continue
                age = now - last
                if age < due * 3600 or age > 23.5 * 3600:
                    continue
                reply = self.flows.followup(n, d, lang)
                if not reply or not await self._send(phone, reply.text, reply.kind, reply.choices):
                    continue
                self.db.add_message(phone, "assistant", reply.text)
                self.db.save_lead(phone, d | {"_followups": n + 1}, lang, None, False)
                self.db.log_event(phone, reply.route)
                sent += 1
        if sent:
            log.info("Sent %d follow-up(s)", sent)
        return sent

    # ---------- helpers ----------
    async def _flow_reply(self, msg: IncomingMessage, text: str, chosen: str | None, lead: dict,
                    language: str) -> FlowReply | None:
        flows = self.flows
        reply = await flows.handle(text, msg.choice_id, lead["data"], language, msg.phone)
        if reply is None and is_greeting(text) and lead["data"].get("_step") in (None, "free"):
            reply = flows.menu(language, welcome=not self.db.has_assistant_replied(msg.phone))
        return reply

    async def _apply_flow(self, msg: IncomingMessage, text: str, reply: FlowReply, lead: dict,
                          language: str) -> None:
        if text:
            self.db.add_message(msg.phone, "user", text)
        if await self._send(msg.phone, reply.text, reply.kind, reply.choices, reply.button_label):
            shown = " | ".join(c["title"] for c in reply.choices)
            self.db.add_message(msg.phone, "assistant",
                                reply.text + (f"\n[Options shown: {shown}]" if shown else ""))
        self.db.log_event(msg.phone, reply.route, text if not msg.choice_id else None)
        log.info("Replied to ...%s via menu (%s)", msg.phone[-4:], reply.route)
        new_data = dict(lead["data"]) | reply.updates
        confirmed = lead["details_confirmed"] or reply.confirmed
        await self._save(msg, lead, new_data, language, confirmed)

    async def _send(self, phone: str, text: str, kind: str, choices: list[dict], label: str = "") -> bool:
        if kind == "buttons" and 1 <= len(choices) <= 3 and len(text) <= 1024:
            sent = await self.sender.send_choices(phone, text, "buttons", choices)
        elif kind == "list" and 1 <= len(choices) <= 10 and len(text) <= 1024:
            sent = await self.sender.send_choices(phone, text, "list", choices, label)
        else:
            return await self.sender.send_text(phone, text)
        if not sent:  # interactive rejected: fall back to plain text
            sent = await self.sender.send_text(phone, text)
        return sent

    async def _save(self, msg: IncomingMessage, lead: dict, new_data: dict, language: str | None,
                    confirmed: bool) -> None:
        # The patient just wrote: restart the follow-up clock.
        new_data = dict(new_data) | {"_last_user_ts": time.time(), "_followups": 0}
        self.db.save_lead(msg.phone, new_data, language, msg.profile_name, confirmed)
        public = lambda d: {k: d.get(k) for k in LEAD_FIELDS}  # noqa: E731
        changed = (public(new_data) != public(lead["data"]) or language != lead["language"]
                   or confirmed != lead["details_confirmed"] or lead["first_seen"] is None)
        saved = self.db.get_lead(msg.phone)
        if self.sheet and changed:
            await self.sheet.upsert(saved)
        if self.alerter:
            if new_data.get("status") == "Hot" and lead["data"].get("status") != "Hot":
                await self.alerter.lead_event(saved, "hot")
            if confirmed and not lead["details_confirmed"]:
                await self.alerter.lead_event(saved, "confirmed")
