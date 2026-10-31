"""Write docs/flow_preview.md: every fixed WhatsApp message, as patients see it, from knowledge/flows.yaml.

Run after editing flows.yaml:  python scripts/flow_preview.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.agent import FLOWS_FILE  # noqa: E402
from app.flows import Flows  # noqa: E402

LANGS = {"mr": "मराठी", "hi": "हिंदी", "en": "English"}
OUT = ROOT / "docs" / "flow_preview.md"


def block(text: str) -> str:
    return f"```\n{text.strip()}\n```\n"


def opts(titles: list[str], label: str = "Buttons") -> str:
    return f"{label}: " + " | ".join(titles) + "\n" if titles else ""


def main() -> None:
    f = Flows(FLOWS_FILE)
    c = f.c
    out = ["# WhatsApp conversation preview (generated from knowledge/flows.yaml)\n",
           "Every fixed message, in the order patients see it. Edit the text in `knowledge/flows.yaml`, "
           "then run `python scripts/flow_preview.py`. Items marked ⚠️ need the clinic's confirmation.\n\n",
           "**Rules:** every chat starts in **Marathi** (no language picker) and switches only when the patient "
           "asks (types \"Hindi\" / \"English\" or \"Hindi me batao\"). Doctor, hospital, address and phone "
           "numbers are **never** shared. If asked, the reply is that our representative will call.\n\n"]

    for lang, name in LANGS.items():
        t = lambda obj: f.t(obj, lang)  # noqa: E731
        btn = lambda keys: [t(c["buttons"][k]) for k in keys if k in c["buttons"]]  # noqa: E731
        n = 1
        out.append(f"---\n## {name}" + (" (default)" if lang == "mr" else " (only if the patient asks)") + "\n")
        pick = f.disease_picker(lang, welcome=True)
        out += [f"**{n}. First message: welcome + which problem?**\n", block(pick.text),
                opts([ch["title"] for ch in pick.choices], "List"), "\n"]
        menu_titles = [ch["title"] for ch in f.menu(lang).choices]
        for item in c["concerns"]:
            n += 1
            if item["id"] == "other":
                out += [f"**{n}. Picked: {t(item['title'])}**\n", block(t(c["prompts"]["concern_text"])),
                        "After they type it:\n", block(f.disease_info({"concern": "other: …"}, lang,
                                                       prefix=t(c["prompts"]["concern_noted"])).text),
                        opts(menu_titles, "Menu"), "\n"]
                continue
            info = f.disease_info({"concern": item["label"]}, lang)
            out += [f"**{n}. Picked: {t(item['title'])}**\n", block(info.text), opts(menu_titles, "Menu"), "\n"]
        for key, title in (("photo", "📷 Send leg photos"), ("other", "❓ Other question"),
                           ("location", "If asked for address / doctor / hospital / phone (menu or AI)")):
            n += 1
            a = c["answers"][key]
            buttons = ([t(c["buttons"][k]) for k in ("scheme_card", "scheme_unknown", "book")]
                       if key == "scheme" else btn(a.get("next", [])))
            out += [f"**{n}. {title}**\n", block(t(a["text"])), opts(buttons), "\n"]
        p = c["prompts"]
        n += 1
        days = ["<day 1>", "<day 2>", "…"]
        out += [f"**{n}. 📅 Book appointment: only the day**\n", block(t(p["date"])),
                opts(days + [t(p["call_first"])], "List"),
                "After picking a day (done, no other questions; a tentative entry goes to the clinic calendar):\n",
                block(t(p["booked"]).replace("{day}", "<day>")),
                "After \"call me first\":\n", block(t(p["booked_call_first"])),
                opts(btn(p.get("done_next", []))), "\n"]
        n += 1
        out += [f"**{n}. 📞 Call me back (one tap)**\n", block(t(p["callback_done"])), "\n"]
        n += 1
        out += [f"**{n}. 📷 Patient sends a photo (legs or Doppler report)**\n",
                "Saved for staff in the inbox; the patient is thanked once per batch of photos:\n",
                block(t(p["photo_received"])), opts(btn(["book", "call", "menu"])), "\n"]
        n += 1
        out.append(f"**{n}. Reminders if the patient stops replying (inside 24 h only)**\n")
        for fu in c.get("followups", []):
            text = t(fu["text"]).replace("{name}", " <name>").replace("{name_comma}", "<name>, ")
            out += [f"After {fu['after_hours']} h:\n", block(text), opts(btn(fu.get("buttons", [])))]
        n += 1
        out += ["\n", f"**{n}. Typed question when AI is off (menu-only mode)**\n",
                block(t(p["no_ai"])), "Then the main menu.\n\n"]
        n += 1
        out += [f"**{n}. ⚠️ Emergency words (always, instantly)**\n",
                block(t(c["emergency"]["text"])), "\n"]

    OUT.write_text("".join(out), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
