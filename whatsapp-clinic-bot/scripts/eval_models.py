"""Compare LLMs on real clinic conversations, using the deployed bot's /diag/llm endpoint.

The API keys stay in Render; this script only needs the bot URL and VERIFY_TOKEN, and the
server must have ENABLE_DIAG=true while you run it.

    python scripts/eval_models.py --url https://vascular-clinic-whatsapp-bot.onrender.com --token <VERIFY_TOKEN>

Writes eval_results.md with every reply, its latency and whether it followed the format.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DEFAULT_LLM_CHAIN  # noqa: E402

CASES = [
    ("mr", "mala payat nasa phuglya ahet ani dukhta"),            # Romanized Marathi
    ("mr", "ऑपरेशनची भीती वाटते, खर्च किती येईल?"),               # Marathi, cost + fear
    ("hi", "पैर में सूजन और दर्द है, क्या बिना बड़े ऑपरेशन के इलाज होगा?"),
    ("en", "Do you help with government schemes? I can't afford much."),
    ("mr", "अचानक श्वास घ्यायला त्रास होतोय आणि पाय खूप सुजला"),      # emergency
    ("mr", "clinic kuthe ahe? Jalna varun yenar"),                 # location
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--token", required=True)
    ap.add_argument("--entries", default=DEFAULT_LLM_CHAIN, help="comma-separated provider:model list")
    ap.add_argument("--out", default="eval_results.md")
    args = ap.parse_args()

    lines = ["# Model evaluation\n"]
    summary = []
    with httpx.Client(timeout=120) as http:
        for entry in [e.strip() for e in args.entries.split(",") if e.strip()]:
            ok, total_ms = 0, 0
            lines.append(f"\n## {entry}\n")
            for lang, q in CASES:
                r = http.get(f"{args.url}/diag/llm",
                             params={"token": args.token, "entry": entry, "q": q, "language": lang})
                if r.status_code == 404:
                    sys.exit("Diag endpoint disabled: set ENABLE_DIAG=true in Render first.")
                d = r.json()
                if d.get("ok"):
                    ok += 1
                    total_ms += d["ms"]
                    t = d["turn"]
                    opts = t["options"]
                    extra = f" [{opts['kind']}: {' | '.join(c['title'] for c in opts['choices'])}]" \
                        if opts["kind"] != "none" else ""
                    lines.append(f"**Q ({lang}):** {q}  \n**A ({d['ms']} ms, {t['language']}, "
                                 f"{t['lead']['status']}):** {t['reply']}{extra}\n")
                else:
                    lines.append(f"**Q ({lang}):** {q}  \n**ERROR:** {d.get('error')}\n")
                time.sleep(2)  # be gentle with free-tier rate limits
            avg = total_ms // ok if ok else 0
            summary.append(f"| {entry} | {ok}/{len(CASES)} | {avg} ms |")
            print(f"{entry}: {ok}/{len(CASES)} ok, avg {avg} ms")
    table = ["\n## Summary\n", "| Model | Valid replies | Avg latency |", "|---|---|---|", *summary]
    Path(args.out).write_text("\n".join(lines[:1] + table + lines[1:]), encoding="utf-8")
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
