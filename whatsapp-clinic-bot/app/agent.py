"""Conversation orchestration: history → Gemini → reply + lead update."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from collections import defaultdict
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


class LLM(Protocol):
    async def generate(self, system_instruction: str, history: list[dict]) -> AgentTurn: ...


class Sender(Protocol):
    async def send_text(self, to: str, body: str) -> bool: ...

    async def send_choices(self, to: str, body: str, kind: str, choices: list[dict],
                           button_label: str = "") -> bool: ...


LANGUAGE_PICKER_BODY = (
    "नमस्कार 🙏 द व्हॅस्कुलर सेंटर (डॉ. अमोल लाहोटी) मध्ये आपलं स्वागत आहे.\n\n"
    "कृपया तुमची भाषा निवडा\nकृपया अपनी भाषा चुनें\nPlease choose your language"
)
LANGUAGE_CHOICES = [
    {"id": "lang_mr", "title": "मराठी"},
    {"id": "lang_hi", "title": "हिंदी"},
    {"id": "lang_en", "title": "English"},
]
LANGUAGE_NAMES = {"mr": "Marathi (मराठी)", "hi": "Hindi (हिंदी)", "en": "English"}
_LANGUAGE_WORDS = {
    "mr": ("marathi", "मराठी", "1"),
    "hi": ("hindi", "हिंदी", "हिन्दी", "2"),
    "en": ("english", "इंग्रजी", "अंग्रेजी", "इंग्लिश", "3"),
}


def detect_language_choice(msg: IncomingMessage) -> str | None:
    """Return 'mr'/'hi'/'en' if the message is a language selection (button tap or typed name)."""
    if msg.choice_id and msg.choice_id.startswith("lang_"):
        return msg.choice_id.removeprefix("lang_")
    text = (msg.text or "").strip().lower().strip(".!")
    for code, words in _LANGUAGE_WORDS.items():
        if text in words:
            return code
    return None


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
        phone = self.clinic_phone
        texts = {
            "mr": "क्षमस्व, सध्या तांत्रिक अडचण आहे. कृपया थोड्या वेळाने पुन्हा मेसेज करा"
                  + (f" किंवा क्लिनिकला कॉल करा: {phone}" if phone else "") + ".",
            "hi": "क्षमा करें, अभी तकनीकी समस्या है. कृपया थोड़ी देर बाद फिर से मैसेज करें"
                  + (f" या क्लिनिक को कॉल करें: {phone}" if phone else "") + ".",
            "en": "Sorry, we're facing a technical issue. Please try again shortly"
                  + (f" or call the clinic: {phone}" if phone else "") + ".",
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

        if msg.type != "text" or not (msg.text or "").strip():
            reply = NON_TEXT_REPLY.get(language or "") or "\n\n".join(NON_TEXT_REPLY.values())
            await self.sender.send_text(msg.phone, reply)
            return

        text = msg.text.strip()
        if (lead["data"].get("_human_until") or 0) > time.time():
            # Staff are chatting with this person from the WhatsApp Business app: stay quiet.
            self.db.add_message(msg.phone, "user", text)
            self.db.log_event(msg.phone, "human", text)
            log.info("Staff handling ...%s, bot paused", msg.phone[-4:])
            return
        chosen = detect_language_choice(msg)
        if chosen:
            # Language picked (first time or later): lock it and answer their earlier message.
            language = chosen
            self.db.save_lead(msg.phone, lead["data"], language, msg.profile_name,
                              lead["details_confirmed"])
            recent = self.db.recent_messages(msg.phone, 1)
            if not recent:
                text = {"mr": "नमस्कार", "hi": "नमस्ते", "en": "Hello"}[language]
            elif recent[-1]["role"] == "user":
                text = ""  # answer the message they sent before picking the language
        elif language is None and not self.db.recent_messages(msg.phone, 1):
            # Very first message: remember it and ask which language they prefer.
            self.db.add_message(msg.phone, "user", text)
            self.db.save_lead(msg.phone, lead["data"], None, msg.profile_name, False)
            await self.sender.send_choices(msg.phone, LANGUAGE_PICKER_BODY, "buttons", LANGUAGE_CHOICES)
            return

        # 1) Menu / predefined flow first: instant, free, and no risk of invented answers.
        if self.flows and language:
            reply = await self._flow_reply(msg, text, chosen, lead, language)
            if reply:
                await self._apply_flow(msg, text, reply, lead, language)
                return

        # 2) Anything the menu can't handle goes to the LLM.
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
        if chosen:
            # Just picked a language: greet with the menu, unless their first message was a real
            # question (then let the LLM answer it; it will offer the menu afterwards).
            recent = self.db.recent_messages(msg.phone, 1)
            prior = recent[-1]["content"] if recent and recent[-1]["role"] == "user" and not text else ""
            return flows.menu(language, welcome=True) if not prior or is_greeting(prior) else None
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
