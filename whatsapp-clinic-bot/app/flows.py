"""Menu-driven conversation (no LLM): main menu, fixed answers and the booking questions.

Content lives in knowledge/flows.yaml. `Flows.handle()` returns a FlowReply when the menu can
answer, or None when the message needs the LLM (free-text questions, "Other question", etc.).
Button/list ids used here all start with "f:" so they never clash with LLM-made options.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

import yaml

from .scheduling import GoogleCalendar, Scheduler

log = logging.getLogger(__name__)

MENU_WORDS = {"menu", "main menu", "मेनू", "मेन्यू", "मुख्य मेनू", "0", "start", "restart", "options"}
GREETINGS = {"hi", "hii", "hiii", "hello", "helo", "hey", "hy", "namaskar", "namaste", "namasthe",
             "नमस्कार", "नमस्ते", "हाय", "हॅलो", "हेलो", "good morning", "good evening", "gm",
             "ram ram", "राम राम", "jai shree krishna", "hello sir", "hi sir", "start"}

BOOK_FIELDS = ["concern", "duration", "name", "city", "preferred_time"]
CALLBACK_FIELDS = ["name", "preferred_time"]
TYPED_STEPS = {"name", "city", "concern_text", "duration", "preferred_time"}

# Menu item -> fixed answer key, or a special action.
MENU_ACTIONS = {"book": "book", "problem": "problem", "callback": "callback", "other": "other",
                "scheme": "scheme",
                "treatment": "answer", "cost": "answer", "location": "answer", "doctor": "answer",
                "videos": "answer"}
# Small "next" buttons -> menu item they open.
BUTTON_TARGETS = {"book": "book", "location": "location", "videos": "videos", "call": "callback",
                  "cost": "cost", "menu": "menu", "scheme": "scheme"}


@dataclass
class FlowReply:
    text: str
    kind: str = "none"            # "none" | "buttons" | "list"
    choices: list[dict] = field(default_factory=list)
    button_label: str = ""
    updates: dict = field(default_factory=dict)   # lead fields to set (None clears)
    confirmed: bool = False
    route: str = "flow"           # for analytics: which menu path answered


def is_greeting(text: str) -> bool:
    t = re.sub(r"[^\w\sऀ-ॿ]", "", (text or "").lower()).strip()
    return not t or t in GREETINGS or len(t) <= 2


FILLERS = {"ok", "okay", "k", "yes", "no", "ho", "haan", "ha", "nahi", "thanks", "thank you", "thx",
           "हो", "हां", "हाँ", "नाही", "नहीं", "ठीक", "ठीक आहे", "ठीक है", "धन्यवाद", "ओके"}
DURATION_WORDS = ("month", "year", "yr", "week", "day", "mahin", "mahin", "varsh", "warsh", "saal",
                  "sal", "aathav", "divas", "din", "महिन", "महीन", "वर्ष", "वर्षे", "साल", "आठवड",
                  "हफ्त", "हफ़्त", "दिवस", "दिन")
TIME_WORDS = ("today", "tomorrow", "morning", "evening", "afternoon", "night", "week", "monday",
              "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "aaj", "udya",
              "kal", "sakal", "sandhya", "dupar", "subah", "shaam", "sham", "आज", "उद्या", "कल",
              "सकाळ", "संध्या", "दुपार", "सुबह", "शाम", "सोमवार", "मंगळवार", "मंगलवार", "बुधवार",
              "गुरुवार", "शुक्रवार", "शनिवार", "रविवार", "am", "pm", "वाजता", "बजे")


def looks_like_answer(text: str, step: str = "name", max_len: int = 40) -> bool:
    """Short typed answer (a name, city, '2 varsha') rather than a question for the LLM."""
    t = (text or "").strip()
    low = t.lower().strip(".!")
    if not (0 < len(t) <= max_len) or "?" in t or len(t.split()) > 6 or low in FILLERS:
        return False
    if step == "duration":
        return any(ch.isdigit() for ch in t) or any(w in low for w in DURATION_WORDS)
    if step == "preferred_time":
        return any(ch.isdigit() for ch in t) or any(w in low for w in TIME_WORDS)
    if step in ("name", "city"):
        return not any(ch.isdigit() for ch in t)
    return True


class Flows:
    def __init__(self, path: Path, calendar: GoogleCalendar | None = None):
        self.path = path
        self.calendar = calendar
        self._cache: tuple[float, dict] | None = None

    @property
    def scheduler(self) -> Scheduler | None:
        cfg = self.c.get("schedule")
        return Scheduler(cfg, self.calendar) if cfg else None

    @property
    def c(self) -> dict:
        """flows.yaml, reloaded whenever the file changes."""
        mtime = self.path.stat().st_mtime
        if not self._cache or self._cache[0] != mtime:
            self._cache = (mtime, yaml.safe_load(self.path.read_text(encoding="utf-8")))
        return self._cache[1]

    @staticmethod
    def t(obj, lang: str) -> str:
        if isinstance(obj, dict):
            return obj.get(lang) or obj.get("en") or ""
        return obj or ""

    # ---------- building blocks ----------
    def menu(self, lang: str, welcome: bool = False) -> FlowReply:
        m = self.c["menu"]
        text = self.t(m["text"], lang)
        if welcome:
            text = f"{self.t(self.c['welcome'], lang)}\n\n{text}"
        choices = [{"id": f"f:m:{it['id']}", "title": self.t(it["title"], lang),
                    "description": self.t(it.get("description"), lang) or None} for it in m["items"]]
        return FlowReply(text, "list", choices, self.t(m["button"], lang),
                         updates={"_step": None, "_flow": None}, route="menu")

    def buttons(self, keys: list[str], lang: str) -> list[dict]:
        b = self.c["buttons"]
        return [{"id": f"f:go:{k}", "title": self.t(b[k], lang)} for k in keys[:3] if k in b]

    def answer(self, key: str, lang: str) -> FlowReply:
        a = self.c["answers"][key]
        btns = self.buttons(a.get("next", []), lang)
        step = "free" if key == "other" else None
        return FlowReply(self.t(a["text"], lang), "buttons" if btns else "none", btns,
                         updates={"_step": step}, route=f"answer:{key}")

    def scheme_answer(self, lang: str) -> FlowReply:
        b = self.c["buttons"]
        ch = [{"id": "f:scheme:card", "title": self.t(b["scheme_card"], lang)},
              {"id": "f:scheme:unknown", "title": self.t(b["scheme_unknown"], lang)},
              {"id": "f:go:book", "title": self.t(b["book"], lang)}]
        return FlowReply(self.t(self.c["answers"]["scheme"]["text"], lang), "buttons", ch,
                         updates={"_step": None}, route="answer:scheme")

    def followup(self, n: int, data: dict, lang: str) -> FlowReply | None:
        """The n-th reminder for a patient who stopped replying (None if there isn't one)."""
        items = self.c.get("followups") or []
        if n >= len(items):
            return None
        f = items[n]
        name = (data.get("name") or "").strip()
        text = (self.t(f["text"], lang).replace("{name}", f" {name}" if name else "")
                .replace("{name_comma}", f"{name}, " if name else ""))
        btns = self.buttons(f.get("buttons", []), lang)
        return FlowReply(text, "buttons" if btns else "none", btns, route=f"followup:{n + 1}")

    def followup_hours(self, n: int) -> float | None:
        items = self.c.get("followups") or []
        return float(items[n]["after_hours"]) if n < len(items) else None

    def _find(self, section: str, item_id: str) -> dict | None:
        return next((x for x in self.c[section] if x["id"] == item_id), None)

    def display(self, field_name: str, value: str | None, lang: str, data: dict | None = None) -> str:
        """Show a stored English label in the user's language when we know it."""
        if field_name == "preferred_time" and data and data.get("_slot") and self.scheduler:
            return self.scheduler.slot_label(datetime.fromisoformat(data["_slot"]), lang)
        section = {"concern": "concerns", "duration": "durations", "preferred_time": "times"}.get(field_name)
        if section and value:
            for x in self.c[section]:
                if x["label"] == value:
                    return self.t(x["title"], lang)
            if value.startswith("other: "):
                return value[7:]
        return value or "-"

    # ---------- booking ----------
    async def next_step(self, data: dict, lang: str, flow: str, prefix: str = "") -> FlowReply:
        required = CALLBACK_FIELDS if flow == "callback" else BOOK_FIELDS
        p = self.c["prompts"]
        missing = next((f for f in required if not data.get(f)), None)
        head = f"{prefix}\n\n" if prefix else ""
        upd = {"_flow": flow}
        if missing == "concern":
            ch = [{"id": f"f:concern:{x['id']}", "title": self.t(x["title"], lang)} for x in self.c["concerns"]]
            return FlowReply(head + self.t(p["concern"], lang), "list", ch, self.t(p["list_button"], lang),
                             updates=upd | {"_step": "concern"}, route="book:concern")
        if missing == "duration":
            ch = [{"id": f"f:dur:{x['id']}", "title": self.t(x["title"], lang)} for x in self.c["durations"]]
            return FlowReply(head + self.t(p["duration"], lang), "buttons", ch,
                             updates=upd | {"_step": "duration"}, route="book:duration")
        if missing in ("name", "city"):
            return FlowReply(head + self.t(p[missing], lang), updates=upd | {"_step": missing},
                             route=f"book:{missing}")
        if missing == "preferred_time" and flow == "book" and self.scheduler:
            free = await self.scheduler.free_slots()
            if not free:  # nothing bookable online: the team will call
                upd2 = self._set(data, preferred_time="call me first")
                r = await self.next_step(data | upd2, lang, flow, prefix=head + self.t(p["no_slots"], lang))
                r.updates = upd2 | r.updates
                return r
            ch = [{"id": f"f:date:{d.isoformat()}", "title": self.scheduler.day_label(d, lang)}
                  for d in list(free)[:9]]
            ch.append({"id": "f:time:call_first", "title": self.t(p["call_first"], lang)})
            return FlowReply(head + self.t(p["date"], lang), "list", ch, self.t(p["date_button"], lang),
                             updates=upd | {"_step": "preferred_time"}, route="book:date")
        if missing == "preferred_time":
            ch = [{"id": f"f:time:{x['id']}", "title": self.t(x["title"], lang)} for x in self.c["times"]]
            return FlowReply(head + self.t(p["preferred_time"], lang), "list", ch,
                             self.t(p["list_button"], lang), updates=upd | {"_step": "preferred_time"},
                             route="book:time")
        # Everything collected: confirm.
        lines = [self.t(p["confirm_title"], lang)]
        for f in ("name", "city", "concern", "duration", "preferred_time"):
            if data.get(f):
                lines.append(f"• {self.t(p['fields'][f], lang)}: {self.display(f, data[f], lang, data)}")
        lines.append(self.t(p["confirm_question"], lang))
        b = self.c["buttons"]
        ch = [{"id": "f:confirm:yes", "title": self.t(b["confirm_yes"], lang)},
              {"id": "f:confirm:change", "title": self.t(b["confirm_change"], lang)}]
        return FlowReply(head + "\n".join(lines), "buttons", ch, updates=upd | {"_step": "confirm"},
                         route="book:confirm")

    async def _slot_choice(self, day: date, session_id: str | None, lang: str) -> FlowReply | None:
        """Session buttons (if both have free slots) or the free-slot list for one day."""
        sched, p = self.scheduler, self.c["prompts"]
        slots = (await sched.free_slots()).get(day, [])
        if not slots:
            return None
        sessions = {sid for sid, _ in slots}
        label = sched.day_label(day, lang)
        if session_id is None and len(sessions) > 1:
            ch = [{"id": f"f:sess:{day.isoformat()}:{s['id']}", "title": self.t(s["title"], lang)}
                  for s in sched.cfg["sessions"] if s["id"] in sessions][:3]
            return FlowReply(self.t(p["session"], lang).replace("{day}", label), "buttons", ch,
                             updates={"_step": "preferred_time"}, route="book:session")
        chosen = [t for sid, t in slots if session_id in (None, sid)][:10]
        ch = [{"id": f"f:slot:{t.isoformat()}", "title": sched.time_label(t)} for t in chosen]
        return FlowReply(self.t(p["slot"], lang).replace("{day}", label), "list", ch,
                         self.t(p["slot_button"], lang), updates={"_step": "preferred_time"},
                         route="book:slot")

    @staticmethod
    def _summary(data: dict) -> str:
        parts = [data.get("concern"), data.get("duration") and f"for {data['duration']}",
                 data.get("preferred_time") and f"prefers {data['preferred_time']}", data.get("scheme")]
        return ", ".join(p for p in parts if p) + " (via menu)"

    def _set(self, data: dict, **fields) -> dict:
        """Apply field updates and refresh status/summary like the LLM would."""
        new = dict(data) | fields
        status = new.get("status")
        if new.get("preferred_time"):
            status = "Hot"
        elif new.get("concern") and status != "Hot":
            status = "Warm"
        upd = dict(fields) | {"status": status, "summary": self._summary(new)}
        return upd

    # ---------- main entry ----------
    async def handle(self, text: str, choice_id: str | None, data: dict, lang: str,
                     phone: str = "") -> FlowReply | None:
        cid = choice_id if choice_id and choice_id.startswith("f:") else None
        t = (text or "").strip()
        flow = data.get("_flow") or "book"

        if not cid:
            if t.lower() in MENU_WORDS:
                return self.menu(lang)
            step = data.get("_step")
            if step in TYPED_STEPS and looks_like_answer(t, step):
                field_name = "concern" if step == "concern_text" else step
                value = f"other: {t}" if step == "concern_text" else t
                upd = self._set(data, **{field_name: value})
                r = await self.next_step(data | upd, lang, flow)
                r.updates = upd | r.updates
                r.route = f"typed:{step}"
                return r
            return None  # free text: LLM

        parts = cid.split(":")
        kind, val = parts[1], ":".join(parts[2:])
        if kind == "menu" or (kind == "go" and val == "menu"):
            return self.menu(lang)
        if kind == "go":
            kind, val = "m", BUTTON_TARGETS.get(val, "menu")
            if val == "menu":
                return self.menu(lang)
        if kind == "m":
            action = MENU_ACTIONS.get(val)
            if action == "answer":
                return self.answer(val, lang)
            if action == "other":
                return self.answer("other", lang)
            if action == "scheme":
                return self.scheme_answer(lang)
            if action in ("book", "problem"):
                return await self.next_step(data, lang, "book")
            if action == "callback":
                return await self.next_step(data, lang, "callback")
            return self.menu(lang)
        if kind == "scheme":  # eligibility answer, then straight into booking
            label = "has scheme card" if val == "card" else "not sure about scheme"
            prefix = self.t(self.c["prompts"]["scheme_card" if val == "card" else "scheme_unknown"], lang)
            upd = {"scheme": label}
            r = await self.next_step(data | upd, lang, "book", prefix=prefix)
            r.updates = upd | r.updates
            r.route = f"scheme:{val}"
            return r
        if kind == "concern":
            item = self._find("concerns", val)
            if not item:
                return self.menu(lang)
            if val == "other":
                return FlowReply(self.t(self.c["prompts"]["concern_text"], lang),
                                 updates={"_step": "concern_text", "_flow": "book"}, route="book:concern_text")
            upd = self._set(data, concern=item["label"])
            r = await self.next_step(data | upd, lang, "book", prefix=self.t(item.get("info"), lang))
            r.updates = upd | r.updates
            r.route = f"concern:{val}"
            return r
        if kind in ("dur", "time"):
            section, field_name = ("durations", "duration") if kind == "dur" else ("times", "preferred_time")
            item = self._find(section, val)
            if not item:
                return self.menu(lang)
            upd = self._set(data, **{field_name: item["label"]})
            r = await self.next_step(data | upd, lang, flow)
            r.updates = upd | r.updates
            r.route = f"{kind}:{val}"
            return r
        if kind in ("date", "sess") and self.scheduler:
            day_s, _, sess = val.partition(":")
            try:
                day = date.fromisoformat(day_s)
            except ValueError:
                return self.menu(lang)
            r = await self._slot_choice(day, sess or None, lang)
            if r:
                return r
            r = await self.next_step(data, lang, "book", prefix=self.t(self.c["prompts"]["slot_taken"], lang))
            r.route = "book:slot_gone"
            return r
        if kind == "slot" and self.scheduler:
            try:
                start = datetime.fromisoformat(val)
            except ValueError:
                return self.menu(lang)
            if not await self.scheduler.is_free(start):
                r = await self.next_step(data | {"preferred_time": None}, lang, "book",
                                         prefix=self.t(self.c["prompts"]["slot_taken"], lang))
                r.route = "book:slot_taken"
                return r
            upd = self._set(data, preferred_time=self.scheduler.slot_label(start, "en")) | {"_slot": val}
            r = await self.next_step(data | upd, lang, flow)
            r.updates = upd | r.updates
            r.route = "book:slot_chosen"
            return r
        if kind == "confirm":
            if val == "yes":
                p = self.c["prompts"]
                name = data.get("name") or ""
                text_out = self.t(p["done"], lang).replace("{name}", name).replace(", !", "!")
                updates = {"_step": None, "_flow": None, "status": "Hot"}
                if data.get("_slot") and self.scheduler:
                    start = datetime.fromisoformat(data["_slot"])
                    desc = (f"Phone: +{phone}\nName: {name}\nCity: {data.get('city') or '-'}\n"
                            f"Concern: {data.get('concern') or '-'} ({data.get('duration') or '-'})\n"
                            "Requested via WhatsApp bot. Call the patient to confirm.")
                    res = await self.scheduler.book(start, f"WhatsApp request: {name or phone} "
                                                           f"({data.get('concern') or 'consultation'})", desc)
                    if res == "taken":
                        cleared = {"preferred_time": None, "_slot": None}
                        r = await self.next_step(data | cleared, lang, "book", prefix=self.t(p["slot_taken"], lang))
                        r.updates = cleared | r.updates
                        r.route = "book:slot_taken"
                        return r
                    if res:
                        text_out += "\n" + self.t(p["requested"], lang).replace(
                            "{slot}", self.scheduler.slot_label(start, lang))
                        updates["_event"] = res
                btns = self.buttons(p.get("done_next", []), lang)
                return FlowReply(text_out, "buttons", btns, updates=updates, confirmed=True,
                                 route="book:confirmed")
            cleared = {f: None for f in (CALLBACK_FIELDS if flow == "callback" else BOOK_FIELDS)} | {"_slot": None}
            r = await self.next_step(data | cleared, lang, flow, prefix=self.t(self.c["prompts"]["change"], lang))
            r.updates = cleared | r.updates
            r.route = "book:change"
            return r
        return self.menu(lang)
