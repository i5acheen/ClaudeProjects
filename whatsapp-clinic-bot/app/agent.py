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


class Sheet(Protocol):
    async def upsert(self, lead: dict) -> None: ...


def build_system_instruction(lead: dict, first_reply: bool) -> str:
    # Read on every call so edits to the .md files apply without restarting.
    prompt = PROMPT_FILE.read_text(encoding="utf-8")
    knowledge = KNOWLEDGE_FILE.read_text(encoding="utf-8")
    context = {
        "first_reply": first_reply,
        "whatsapp_profile_name": lead.get("profile_name"),
        "current_lead_details": {k: lead["data"].get(k) for k in LEAD_FIELDS},
        "details_already_confirmed": lead.get("details_confirmed", False),
    }
    return (
        f"{prompt}\n\n---\n# Clinic knowledge\n{knowledge}\n\n---\n"
        f"# Context for this conversation\n```json\n{json.dumps(context, ensure_ascii=False, indent=2)}\n```"
    )


def format_for_whatsapp(text: str) -> str:
    """Break a long single-paragraph reply into short lines, one sentence per line."""
    text = text.strip()
    if "\n" in text or len(text) < 160:
        return text
    return re.sub(r"([.?!।])\s+(?=\S)", r"\1\n", text)


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

        if msg.type != "text" or not (msg.text or "").strip():
            lang = lead.get("language")
            reply = NON_TEXT_REPLY.get(lang) or f"{NON_TEXT_REPLY['mr']}\n{NON_TEXT_REPLY['en']}"
            await self.sender.send_text(msg.phone, reply)
            return

        self.db.add_message(msg.phone, "user", msg.text.strip())
        first_reply = not self.db.has_assistant_replied(msg.phone)
        history = self.db.recent_messages(msg.phone, self.history_limit)
        system = build_system_instruction(lead, first_reply)

        try:
            turn = await self.llm.generate(system, history)
        except Exception as exc:
            log.error("Gemini call failed: %s: %s", type(exc).__name__, str(exc)[:500])
            await self.sender.send_text(msg.phone, self.fallback_reply())
            return

        reply = format_for_whatsapp(turn.reply) or self.fallback_reply()
        if await self.sender.send_text(msg.phone, reply):
            self.db.add_message(msg.phone, "assistant", reply)
            log.info("Replied to ...%s (status=%s)", msg.phone[-4:], turn.lead.status)

        new_data = merge_lead(lead["data"], turn.lead.model_dump())
        confirmed = lead["details_confirmed"] or turn.details_confirmed
        self.db.save_lead(msg.phone, new_data, turn.language, msg.profile_name, confirmed)

        changed = (new_data != lead["data"] or turn.language != lead["language"]
                   or confirmed != lead["details_confirmed"] or lead["first_seen"] is None)
        if self.sheet and changed:
            await self.sheet.upsert(self.db.get_lead(msg.phone))
