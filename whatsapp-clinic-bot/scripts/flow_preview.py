"""Write docs/flow_preview.md: every fixed WhatsApp message, as patients see it, from knowledge/flows.yaml.

Run after editing flows.yaml:  python scripts/flow_preview.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.agent import FLOWS_FILE, LANGUAGE_CHOICES, LANGUAGE_PICKER_BODY  # noqa: E402
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
           "then run `python scripts/flow_preview.py`. Clinic address, map link and phone are set once in "
           "the `business:` block. Items marked ⚠️ need the clinic's confirmation.\n",
           "## 0. First message: language picker (same for everyone)\n",
           block(LANGUAGE_PICKER_BODY), opts([x["title"] for x in LANGUAGE_CHOICES]), "\n"]

    for lang, name in LANGS.items():
        t = lambda obj: f.t(obj, lang)  # noqa: E731
        btn = lambda keys: [t(c["buttons"][k]) for k in keys if k in c["buttons"]]  # noqa: E731
        n = 1
        out.append(f"---\n## {name}\n")
        menu = f.menu(lang, welcome=True)
        out += [f"**{n}. Welcome + main menu**\n", block(menu.text),
                opts([ch["title"] for ch in menu.choices], "Menu"), "\n"]
        for key, title in (("scheme", "🆓 Free treatment under scheme"), ("treatment", "💉 How treatment works"),
                           ("cost", "💰 Cost & insurance"), ("location", "📍 Location & contact"),
                           ("other", "❓ Other question")):
            n += 1
            a = c["answers"][key]
            buttons = ([t(c["buttons"][k]) for k in ("scheme_card", "scheme_unknown", "book")]
                       if key == "scheme" else btn(a.get("next", [])))
            out += [f"**{n}. {title}**\n", block(t(a["text"])), opts(buttons), "\n"]
        p = c["prompts"]
        n += 1
        out += [f"**{n}. Scheme answer → then booking starts**\n",
                "If ✅ card:\n", block(t(p["scheme_card"])), "If ❓ not sure:\n", block(t(p["scheme_unknown"])), "\n"]
        n += 1
        out += [f"**{n}. 📅 Booking (one question at a time; known answers are skipped)**\n",
                "a) Problem\n", block(t(p["concern"])), opts([t(x["title"]) for x in c["concerns"]], "List"),
                "b) How long\n", block(t(p["duration"])), opts([t(x["title"]) for x in c["durations"]]),
                "c) Name\n", block(t(p["name"])), "d) City\n", block(t(p["city"])),
                "e) Day → morning/evening → time (from the clinic hours in `schedule`, ⚠️ example hours)\n",
                block(t(p["date"])), block(t(p["session"]).replace("{day}", "<day>")),
                block(t(p["slot"]).replace("{day}", "<day>")),
                "f) Confirm\n", block(f"{t(p['confirm_title'])}\n• {t(p['fields']['name'])}: …\n"
                                      f"• {t(p['fields']['preferred_time'])}: …\n{t(p['confirm_question'])}"),
                opts([t(c["buttons"]["confirm_yes"]), t(c["buttons"]["confirm_change"])]),
                "g) Done\n", block(t(p["done"]).replace("{name}", "<name>")), opts(btn(p.get("done_next", []))),
                "\n"]
        n += 1
        out += [f"**{n}. 📞 Call me back**\n", "Asks name, then preferred time:\n", block(t(p["preferred_time"])),
                opts([t(x["title"]) for x in c["times"]], "List"), "\n"]
        n += 1
        out.append(f"**{n}. Reminders if the patient stops replying (inside 24 h only)**\n")
        for fu in c.get("followups", []):
            text = t(fu["text"]).replace("{name}", " <name>").replace("{name_comma}", "<name>, ")
            out += [f"After {fu['after_hours']} h:\n", block(text), opts(btn(fu.get("buttons", [])))]
        n += 1
        out += ["\n", f"**{n}. Typed question when AI is off (menu-only mode)**\n",
                block(t(p["no_ai"]).replace("{phone}", "<clinic phone>")), "Then the main menu.\n\n"]
        n += 1
        out += [f"**{n}. ⚠️ Emergency words (always, instantly)**\n",
                block(t(c["emergency"]["text"]).replace("{phone}", "<clinic phone>")), "\n"]

    OUT.write_text("".join(out), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
