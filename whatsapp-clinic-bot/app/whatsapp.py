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
                text = msg.get("text", {}).get("body") if mtype == "text" else None
                out.append(IncomingMessage(msg_id, sender, mtype, text, names.get(sender)))
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

    async def mark_read(self, message_id: str) -> None:
        """Show blue ticks to the user (best effort)."""
        payload = {"messaging_product": "whatsapp", "status": "read", "message_id": message_id}
        try:
            await self._http.post(self._url, json=payload, headers=self._headers)
        except httpx.HTTPError:
            pass

    async def aclose(self) -> None:
        await self._http.aclose()
