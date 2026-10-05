"""Appointment slots from clinic hours, optionally checked against / written to Google Calendar.

Clinic hours live in knowledge/flows.yaml (`schedule:`). If GOOGLE_CALENDAR_ID is set and the
calendar is shared with the service account, busy times are hidden and confirmed requests are
added to the calendar as tentative events. Without a calendar, slots come from the hours alone.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

log = logging.getLogger(__name__)

WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DAY_NAMES = {
    "mr": ["सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि", "रवि"],
    "hi": ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"],
    "en": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
}
MONTH_NAMES = {
    "mr": ["जाने", "फेब्रु", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑग", "सप्टें", "ऑक्टो", "नोव्हें", "डिसें"],
    "hi": ["जन", "फ़र", "मार्च", "अप्रैल", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस"],
    "en": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
}
RELATIVE = {"mr": ("आज", "उद्या"), "hi": ("आज", "कल"), "en": ("Today", "Tomorrow")}


class GoogleCalendar:
    """Minimal Google Calendar client using the existing service account."""

    SCOPES = ["https://www.googleapis.com/auth/calendar"]
    API = "https://www.googleapis.com/calendar/v3"

    def __init__(self, service_account_file: Path, calendar_id: str):
        from google.auth.transport.requests import AuthorizedSession
        from google.oauth2 import service_account

        creds = service_account.Credentials.from_service_account_file(str(service_account_file),
                                                                      scopes=self.SCOPES)
        self._session = AuthorizedSession(creds)
        self.calendar_id = calendar_id

    def _busy_sync(self, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
        r = self._session.post(f"{self.API}/freeBusy", json={
            "timeMin": start.isoformat(), "timeMax": end.isoformat(),
            "items": [{"id": self.calendar_id}]}, timeout=15)
        r.raise_for_status()
        cal = r.json()["calendars"][self.calendar_id]
        if cal.get("errors"):
            raise RuntimeError(f"calendar error: {cal['errors'][0].get('reason')}")
        return [(datetime.fromisoformat(b["start"].replace("Z", "+00:00")),
                 datetime.fromisoformat(b["end"].replace("Z", "+00:00"))) for b in cal["busy"]]

    def _create_sync(self, start: datetime, end: datetime, summary: str, description: str) -> str:
        r = self._session.post(f"{self.API}/calendars/{self.calendar_id}/events", json={
            "summary": summary, "description": description, "status": "tentative",
            "start": {"dateTime": start.isoformat()}, "end": {"dateTime": end.isoformat()}}, timeout=15)
        r.raise_for_status()
        return r.json().get("id", "")

    async def busy(self, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
        return await asyncio.to_thread(self._busy_sync, start, end)

    async def create_event(self, start: datetime, end: datetime, summary: str, description: str) -> str:
        return await asyncio.to_thread(self._create_sync, start, end, summary, description)


class Scheduler:
    def __init__(self, config: dict, calendar: GoogleCalendar | None = None):
        self.cfg = config
        self.calendar = calendar
        self.tz = ZoneInfo(config.get("timezone", "Asia/Kolkata"))

    # ---------- clinic hours ----------
    @property
    def slot_minutes(self) -> int:
        return int(self.cfg.get("slot_minutes", 30))

    def _sessions(self) -> list[dict]:
        return self.cfg.get("sessions", [])

    def _all_slots(self, day: date) -> list[tuple[str, datetime]]:
        """(session_id, start) for every slot on an open day, per clinic hours."""
        if WEEKDAYS[day.weekday()] not in self.cfg.get("open_days", []):
            return []
        if day.isoformat() in {str(d) for d in self.cfg.get("closed_dates", []) or []}:
            return []
        out = []
        for s in self._sessions():
            h1, m1 = map(int, s["start"].split(":"))
            h2, m2 = map(int, s["end"].split(":"))
            cur = datetime.combine(day, time(h1, m1), self.tz)
            end = datetime.combine(day, time(h2, m2), self.tz)
            while cur + timedelta(minutes=self.slot_minutes) <= end:
                out.append((s["id"], cur))
                cur += timedelta(minutes=self.slot_minutes)
        return out

    async def _busy(self, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
        if not self.calendar:
            return []
        try:
            return await self.calendar.busy(start, end)
        except Exception as exc:  # calendar trouble shouldn't block booking requests
            log.error("Calendar busy check failed: %s", type(exc).__name__)
            return []

    async def free_slots(self, now: datetime | None = None, days: int | None = None) -> dict[date, list[tuple[str, datetime]]]:
        """Free slots per open day for the next `days_ahead` days (one calendar query)."""
        now = now or datetime.now(self.tz)
        days = days or int(self.cfg.get("days_ahead", 7))
        earliest = now + timedelta(minutes=int(self.cfg.get("min_notice_minutes", 120)))
        dates = [now.date() + timedelta(days=i) for i in range(days + 1)]
        start = datetime.combine(dates[0], time(0), self.tz)
        busy = await self._busy(start, start + timedelta(days=days + 1))
        length = timedelta(minutes=self.slot_minutes)
        result: dict[date, list[tuple[str, datetime]]] = {}
        for d in dates:
            free = [(sid, t) for sid, t in self._all_slots(d)
                    if t >= earliest and not any(b0 < t + length and t < b1 for b0, b1 in busy)]
            if free:
                result[d] = free
        return result

    async def is_free(self, start: datetime) -> bool:
        length = timedelta(minutes=self.slot_minutes)
        busy = await self._busy(start, start + length)
        return not any(b0 < start + length and start < b1 for b0, b1 in busy)

    async def book(self, start: datetime, summary: str, description: str) -> str | None:
        """Add a tentative event. Returns 'taken' if the slot is no longer free, None if no calendar."""
        if not self.calendar:
            return None
        if not await self.is_free(start):
            return "taken"
        try:
            return await self.calendar.create_event(start, start + timedelta(minutes=self.slot_minutes),
                                                    summary, description)
        except Exception as exc:
            log.error("Calendar event creation failed: %s", type(exc).__name__)
            return None

    # ---------- labels ----------
    def day_label(self, d: date, lang: str, today: date | None = None) -> str:
        today = today or datetime.now(self.tz).date()
        rel = RELATIVE.get(lang, RELATIVE["en"])
        base = f"{DAY_NAMES[lang if lang in DAY_NAMES else 'en'][d.weekday()]}, {d.day} " \
               f"{MONTH_NAMES[lang if lang in MONTH_NAMES else 'en'][d.month - 1]}"
        if d == today:
            return f"{rel[0]} ({base})"
        if d == today + timedelta(days=1):
            return f"{rel[1]} ({base})"
        return base

    @staticmethod
    def time_label(t: datetime) -> str:
        return t.strftime("%I:%M %p").lstrip("0")

    def slot_label(self, t: datetime, lang: str) -> str:
        return f"{self.day_label(t.date(), lang)}, {self.time_label(t)}"
