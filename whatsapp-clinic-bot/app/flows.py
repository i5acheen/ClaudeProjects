"""Menu-driven conversation (no LLM): main menu, fixed answers and the booking questions.

Content lives in knowledge/flows.yaml. `Flows.handle()` returns a FlowReply when the menu can
answer, or None when the message needs the LLM (free-text questions, "Other question", etc.).
Button/list ids used here all start with "f:" so they never clash with LLM-made options.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

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
                "treatment": "answer", "cost": "answer", "location": "answer", "doctor": "answer",
                "videos": "answer"}
# Small "next" buttons -> menu item they open.
BUTTON_TARGETS = {"book": "book", "location": "location", "videos": "videos", "call": "callback",
                  "cost": "cost", "menu": "menu"}


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
    def __init__(self, path: Path):
        self.path = path
        self._cache: tuple[float, dict] | None = None

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

    def _find(self, section: str, item_id: str) -> dict | None:
        return next((x for x in self.c[section] if x["id"] == item_id), None)

    def display(self, field_name: str, value: str | None, lang: str) -> str:
        """Show a stored English label in the user's language when we know it."""
        section = {"concern": "concerns", "duration": "durations", "preferred_time": "times"}.get(field_name)
        if section and value:
            for x in self.c[section]:
                if x["label"] == value:
                    return self.t(x["title"], lang)
            if value.startswith("other: "):
                return value[7:]
        return value or "-"

    # ---------- booking ----------
    def next_step(self, data: dict, lang: str, flow: str, prefix: str = "") -> FlowReply:
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
        if missing == "preferred_time":
            ch = [{"id": f"f:time:{x['id']}", "title": self.t(x["title"], lang)} for x in self.c["times"]]
            return FlowReply(head + self.t(p["preferred_time"], lang), "list", ch,
                             self.t(p["list_button"], lang), updates=upd | {"_step": "preferred_time"},
                             route="book:time")
        # Everything collected: confirm.
        lines = [self.t(p["confirm_title"], lang)]
        for f in ("name", "city", "concern", "duration", "preferred_time"):
            if data.get(f):
                lines.append(f"• {self.t(p['fields'][f], lang)}: {self.display(f, data[f], lang)}")
        lines.append(self.t(p["confirm_question"], lang))
        b = self.c["buttons"]
        ch = [{"id": "f:confirm:yes", "title": self.t(b["confirm_yes"], lang)},
              {"id": "f:confirm:change", "title": self.t(b["confirm_change"], lang)}]
        return FlowReply(head + "\n".join(lines), "buttons", ch, updates=upd | {"_step": "confirm"},
                         route="book:confirm")

    @staticmethod
    def _summary(data: dict) -> str:
        parts = [data.get("concern"), data.get("duration") and f"for {data['duration']}",
                 data.get("preferred_time") and f"prefers {data['preferred_time']}"]
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
    def handle(self, text: str, choice_id: str | None, data: dict, lang: str) -> FlowReply | None:
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
                r = self.next_step(data | upd, lang, flow)
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
            if action in ("book", "problem"):
                return self.next_step(data, lang, "book")
            if action == "callback":
                return self.next_step(data, lang, "callback")
            return self.menu(lang)
        if kind == "concern":
            item = self._find("concerns", val)
            if not item:
                return self.menu(lang)
            if val == "other":
                return FlowReply(self.t(self.c["prompts"]["concern_text"], lang),
                                 updates={"_step": "concern_text", "_flow": "book"}, route="book:concern_text")
            upd = self._set(data, concern=item["label"])
            r = self.next_step(data | upd, lang, "book", prefix=self.t(item.get("info"), lang))
            r.updates = upd | r.updates
            r.route = f"concern:{val}"
            return r
        if kind in ("dur", "time"):
            section, field_name = ("durations", "duration") if kind == "dur" else ("times", "preferred_time")
            item = self._find(section, val)
            if not item:
                return self.menu(lang)
            upd = self._set(data, **{field_name: item["label"]})
            r = self.next_step(data | upd, lang, flow)
            r.updates = upd | r.updates
            r.route = f"{kind}:{val}"
            return r
        if kind == "confirm":
            if val == "yes":
                name = data.get("name") or ""
                btns = self.buttons(self.c["prompts"].get("done_next", []), lang)
                return FlowReply(self.t(self.c["prompts"]["done"], lang).replace("{name}", name).replace(", !", "!"),
                                 "buttons", btns, updates={"_step": None, "_flow": None, "status": "Hot"},
                                 confirmed=True, route="book:confirmed")
            cleared = {f: None for f in (CALLBACK_FIELDS if flow == "callback" else BOOK_FIELDS)}
            r = self.next_step(data | cleared, lang, flow, prefix=self.t(self.c["prompts"]["change"], lang))
            r.updates = cleared | r.updates
            r.route = "book:change"
            return r
        return self.menu(lang)
