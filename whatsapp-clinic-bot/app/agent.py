"""Conversation orchestration: history → Gemini → reply + lead update."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from collections import defaultdict
from pathlib import Path
from typing import Protocol

from .db import LEAD_FIELDS, Database
from .llm import AgentTurn
from .whatsapp import IncomingMessage

log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
PROMPT_FILE = BASE_DIR / "prompts" / "system_prompt.md"
KNOWLEDGE_FILE = BASE_DIR / "knowledge" / "clinic_info.md"

# Sent without calling the LLM, so they are bilingual (we may not know the user's language yet).
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


def options_as_text(turn_options) -> str:
    """How offered options are remembered in history, so the model knows what was shown."""
    if turn_options.kind == "none" or not turn_options.choices:
        return ""
    return "\n[Options shown: " + " | ".join(c.title for c in turn_options.choices) + "]"


class Sheet(Protocol):
    async def upsert(self, lead: dict) -> None: ...


def build_system_instruction(lead: dict, first_reply: bool, language: str | None = None) -> str:
    # Read on every call so edits to the .md files apply without restarting.
    prompt = PROMPT_FILE.read_text(encoding="utf-8")
    knowledge = KNOWLEDGE_FILE.read_text(encoding="utf-8")
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
                 history_limit: int = 15, clinic_phone: str = ""):
        self.db, self.llm, self.sender, self.sheet = db, llm, sender, sheet
        self.history_limit = history_limit
        self.clinic_phone = clinic_phone
        self._locks: defaultdict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    def fallback_reply(self) -> str:
        phone = f" {self.clinic_phone}" if self.clinic_phone else ""
        return ("क्षमस्व, सध्या तांत्रिक अडचण आहे. कृपया थोड्या वेळाने पुन्हा मेसेज करा"
                + (f" किंवा क्लिनिकला कॉल करा:{phone}" if phone else "") + ".\n"
                "Sorry, we're facing a technical issue. Please try again shortly"
                + (f" or call the clinic:{phone}" if phone else "") + ".")

    async def handle(self, msg: IncomingMessage) -> None:
        # One message at a time per user, so history and lead state stay consistent.
        async with self._locks[msg.phone]:
            try:
                await self._handle(msg)
            except Exception:
                log.exception("Failed to handle message %s", msg.message_id)

    async def _handle(self, msg: IncomingMessage) -> None:
        log.info("Handling %s message from ...%s", msg.type, msg.phone[-4:])
        lead = self.db.get_lead(msg.phone)
        language = lead.get("language")

        if msg.type != "text" or not (msg.text or "").strip():
            reply = NON_TEXT_REPLY.get(language) or f"{NON_TEXT_REPLY['mr']}\n{NON_TEXT_REPLY['en']}"
            await self.sender.send_text(msg.phone, reply)
            return

        text = msg.text.strip()
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

        if text:
            self.db.add_message(msg.phone, "user", text)
        first_reply = not self.db.has_assistant_replied(msg.phone)
        history = self.db.recent_messages(msg.phone, self.history_limit)
        lead = self.db.get_lead(msg.phone)
        system = build_system_instruction(lead, first_reply, language)

        try:
            turn = await self.llm.generate(system, history)
        except Exception as exc:
            log.error("Gemini call failed: %s: %s", type(exc).__name__, str(exc)[:500])
            await self.sender.send_text(msg.phone, self.fallback_reply())
            return

        # Keep the chosen language unless the person explicitly asked to switch.
        if language is None:
            language = turn.language
        elif turn.language != language and mentions_language(text, turn.language):
            language = turn.language

        reply = format_for_whatsapp(turn.reply) or self.fallback_reply()
        opts = turn.options
        choices = [c.model_dump() for c in opts.choices if c.id and c.title]
        if opts.kind == "buttons" and 1 <= len(choices) <= 3 and len(reply) <= 1024:
            sent = await self.sender.send_choices(msg.phone, reply, "buttons", choices)
        elif opts.kind == "list" and 1 <= len(choices) <= 10 and len(reply) <= 1024:
            sent = await self.sender.send_choices(msg.phone, reply, "list", choices,
                                                  opts.button_label or "")
        else:
            sent = await self.sender.send_text(msg.phone, reply)
        if not sent and opts.kind != "none":  # interactive rejected: fall back to plain text
            sent = await self.sender.send_text(msg.phone, reply)
        if sent:
            self.db.add_message(msg.phone, "assistant", reply + options_as_text(opts))
            log.info("Replied to ...%s (status=%s, options=%s)", msg.phone[-4:], turn.lead.status, opts.kind)

        new_data = merge_lead(lead["data"], turn.lead.model_dump())
        confirmed = lead["details_confirmed"] or turn.details_confirmed
        self.db.save_lead(msg.phone, new_data, language, msg.profile_name, confirmed)

        changed = (new_data != lead["data"] or language != lead["language"]
                   or confirmed != lead["details_confirmed"] or lead["first_seen"] is None)
        if self.sheet and changed:
            await self.sheet.upsert(self.db.get_lead(msg.phone))
