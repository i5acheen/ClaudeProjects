"""Google Sheets lead log (one row per phone number, updated in place)."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import gspread

log = logging.getLogger(__name__)

IST = ZoneInfo("Asia/Kolkata")
HEADERS = [
    "First Seen (IST)", "Last Updated (IST)", "Phone", "WhatsApp Name", "Name", "City/Area",
    "Concern", "Duration", "Preferred Time", "Language", "Status", "Details Confirmed", "Summary",
]
PHONE_COL = HEADERS.index("Phone") + 1


class LeadSheet:
    def __init__(self, service_account_file: Path, sheet_id: str, tab: str):
        self._file, self._sheet_id, self._tab = service_account_file, sheet_id, tab
        self._ws: gspread.Worksheet | None = None

    def _worksheet(self) -> gspread.Worksheet:
        if self._ws is None:
            gc = gspread.service_account(filename=str(self._file))
            sh = gc.open_by_key(self._sheet_id)
            try:
                ws = sh.worksheet(self._tab)
            except gspread.WorksheetNotFound:
                ws = sh.add_worksheet(self._tab, rows=1000, cols=len(HEADERS))
            if ws.row_values(1) != HEADERS:
                ws.update([HEADERS], "A1")
            self._ws = ws
        return self._ws

    def _upsert_sync(self, lead: dict) -> None:
        ws = self._worksheet()
        now = datetime.now(IST).strftime("%Y-%m-%d %H:%M")
        phone = f"+{lead['phone']}"
        d = lead["data"]
        cell = ws.find(phone, in_column=PHONE_COL)
        first_seen = ws.cell(cell.row, 1).value if cell else now
        row = [
            first_seen, now, phone, lead.get("profile_name") or "", d.get("name") or "",
            d.get("city") or "", d.get("concern") or "", d.get("duration") or "",
            d.get("preferred_time") or "", lead.get("language") or "", d.get("status") or "",
            "Yes" if lead.get("details_confirmed") else "No", d.get("summary") or "",
        ]
        if cell:
            ws.update([row], f"A{cell.row}", value_input_option="RAW")
        else:
            ws.append_row(row, value_input_option="RAW")

    async def upsert(self, lead: dict) -> None:
        try:
            await asyncio.to_thread(self._upsert_sync, lead)
        except Exception:  # never let Sheets problems break the chat
            log.exception("Google Sheets upsert failed for %s", lead.get("phone"))
            self._ws = None
