"""WhatsApp Cloud API: parse incoming webhook payloads and send text replies."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class IncomingMessage:
    message_id: str
    phone: str            # sender's WhatsApp ID (international format, no '+')
    type: str             # 'text', 'image', 'audio', 'video', 'document', 'sticker', ...
    text: str | None
    profile_name: str | None
    choice_id: str | None = None  # id of a tapped button / list row, if any


def parse_messages(payload: dict) -> list[IncomingMessage]:
    """Extract user messages from a webhook payload. Status updates (sent/delivered/read) are skipped."""
    out: list[IncomingMessage] = []
    if payload.get("object") != "whatsapp_business_account":
        return out
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            names = {c.get("wa_id"): c.get("profile", {}).get("name")
                     for c in value.get("contacts", [])}
            for msg in value.get("messages", []):  # absent for pure status updates
                msg_id, sender = msg.get("id"), msg.get("from")
                if not msg_id or not sender:
                    continue
                mtype = msg.get("type", "unknown")
                text, choice_id = None, None
                if mtype == "text":
                    text = msg.get("text", {}).get("body")
                elif mtype == "interactive":  # tapped reply button or list row
                    inter = msg.get("interactive", {})
                    picked = inter.get("button_reply") or inter.get("list_reply") or {}
                    text, choice_id, mtype = picked.get("title"), picked.get("id"), "text"
                elif mtype == "button":  # quick-reply button on a template message
                    text, choice_id, mtype = msg.get("button", {}).get("text"), None, "text"
                out.append(IncomingMessage(msg_id, sender, mtype, text, names.get(sender), choice_id))
    return out


class WhatsAppClient:
    def __init__(self, token: str, phone_number_id: str, api_version: str):
        self._url = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"
        self._headers = {"Authorization": f"Bearer {token}"}
        self._http = httpx.AsyncClient(timeout=15)

    async def send_text(self, to: str, body: str) -> bool:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": "https://" in body, "body": body[:4096]},
        }
        try:
            resp = await self._http.post(self._url, json=payload, headers=self._headers)
        except httpx.HTTPError as exc:
            log.error("WhatsApp send failed (network): %s", exc)
            return False
        if resp.status_code >= 400:
            log.error("WhatsApp send failed %s: %s", resp.status_code, resp.text[:500])
            return False
        return True

    async def send_choices(self, to: str, body: str, kind: str, choices: list[dict],
                           button_label: str = "") -> bool:
        """Send tap-to-choose options: kind='buttons' (max 3) or 'list' (max 10).

        choices: [{'id': str, 'title': str, 'description': str | None}]
        """
        if kind == "buttons":
            action = {"buttons": [{"type": "reply", "reply": {"id": c["id"][:256], "title": c["title"][:20]}}
                                  for c in choices[:3]]}
        else:
            rows = []
            for c in choices[:10]:
                row = {"id": c["id"][:200], "title": c["title"][:24]}
                if c.get("description"):
                    row["description"] = c["description"][:72]
                rows.append(row)
            action = {"button": (button_label or "Options")[:20],
                      "sections": [{"title": (button_label or "Options")[:24], "rows": rows}]}
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": {"type": "button" if kind == "buttons" else "list",
                            "body": {"text": body[:1024]}, "action": action},
        }
        try:
            resp = await self._http.post(self._url, json=payload, headers=self._headers)
        except httpx.HTTPError as exc:
            log.error("WhatsApp interactive send failed (network): %s", exc)
            return False
        if resp.status_code >= 400:
            log.error("WhatsApp interactive send failed %s: %s", resp.status_code, resp.text[:500])
            return False
        return True

    async def mark_read(self, message_id: str) -> None:
        """Show blue ticks to the user (best effort)."""
        payload = {"messaging_product": "whatsapp", "status": "read", "message_id": message_id}
        try:
            await self._http.post(self._url, json=payload, headers=self._headers)
        except httpx.HTTPError:
            pass

    async def aclose(self) -> None:
        await self._http.aclose()
