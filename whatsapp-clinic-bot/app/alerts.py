"""Notify the clinic team about hot leads and bot failures (WhatsApp and/or email)."""

from __future__ import annotations

import asyncio
import logging
import smtplib
import time
from collections import defaultdict, deque
from email.message import EmailMessage

log = logging.getLogger(__name__)


class Alerter:
    def __init__(self, db, sender, alert_phone: str = "", email_to: str = "", smtp_host: str = "",
                 smtp_port: int = 587, smtp_user: str = "", smtp_password: str = ""):
        self.db, self.sender = db, sender
        self.alert_phone = alert_phone.lstrip("+").replace(" ", "")
        self.email_to = email_to
        self.smtp = (smtp_host, smtp_port, smtp_user, smtp_password)

    @property
    def enabled(self) -> bool:
        return bool(self.alert_phone or (self.email_to and all(self.smtp)))

    async def lead_event(self, lead: dict, kind: str) -> None:
        """kind: 'hot' or 'confirmed'. Sent once per lead per kind."""
        if not self.enabled or not self.db.mark_processed(f"alert:{kind}:{lead['phone']}"):
            return
        d = lead["data"]
        title = "✅ Lead confirmed details" if kind == "confirmed" else "🔥 Hot lead"
        body = (f"{title}\n"
                f"Phone: +{lead['phone']}\n"
                f"Name: {d.get('name') or lead.get('profile_name') or '-'}\n"
                f"City: {d.get('city') or '-'}\n"
                f"Concern: {d.get('concern') or '-'} ({d.get('duration') or '-'})\n"
                f"Preferred time: {d.get('preferred_time') or '-'}\n"
                f"Summary: {d.get('summary') or '-'}")
        await self._send(f"{title}: +{lead['phone']}", body)

    async def bot_failure(self, phone: str) -> None:
        # At most one failure alert per user per hour.
        if not self.enabled or not self.db.mark_processed(f"alert:fail:{phone}:{int(time.time() // 3600)}"):
            return
        await self._send("⚠️ WhatsApp bot could not reply",
                         f"⚠️ The bot could not generate a reply for +{phone}. Please contact them directly.")

    async def _send(self, subject: str, body: str) -> None:
        if self.alert_phone:
            # Free-form WhatsApp only arrives if ALERT_PHONE messaged the bot in the last 24 h.
            if not await self.sender.send_text(self.alert_phone, body):
                log.warning("WhatsApp alert to team failed (has ALERT_PHONE messaged the bot in 24h?)")
        if self.email_to and all(self.smtp):
            try:
                await asyncio.to_thread(self._email, subject, body)
            except Exception as exc:
                log.error("Email alert failed: %s", type(exc).__name__)

    def _email(self, subject: str, body: str) -> None:
        host, port, user, password = self.smtp
        msg = EmailMessage()
        msg["Subject"], msg["From"], msg["To"] = subject, user, self.email_to
        msg.set_content(body)
        with smtplib.SMTP(host, port, timeout=20) as s:
            s.starttls()
            s.login(user, password)
            s.send_message(msg)


class RateLimiter:
    """Allow at most `count` messages per `window` seconds per phone (protects LLM quota)."""

    def __init__(self, count: int = 20, window: int = 600):
        self.count, self.window = count, window
        self._hits: defaultdict[str, deque] = defaultdict(deque)

    def allow(self, phone: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        q = self._hits[phone]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.count:
            return False
        q.append(now)
        return True
