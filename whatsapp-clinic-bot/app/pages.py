"""Public HTML pages required by Meta for app publishing (privacy policy, data deletion)."""

from __future__ import annotations

CONTACT_EMAIL = "thevascularcenter@gmail.com"
UPDATED = "3 October 2026"

_STYLE = """
<style>
  :root { --bg:#fff; --fg:#1d2733; --muted:#5b6672; --accent:#0b6e4f; }
  @media (prefers-color-scheme: dark) { :root { --bg:#111417; --fg:#e7ebef; --muted:#9aa5b1; --accent:#4cc79a; } }
  body { margin:0; background:var(--bg); color:var(--fg);
         font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { max-width:760px; margin:0 auto; padding:32px 16px 64px; }
  h1 { font-size:1.6rem; margin:0 0 4px; } h2 { font-size:1.15rem; margin-top:28px; }
  .muted { color:var(--muted); font-size:.9rem; } a { color:var(--accent); }
  li { margin:4px 0; }
</style>
"""


def _page(title: str, body: str) -> str:
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">'
            f"<title>{title}</title>{_STYLE}</head><body><main>{body}</main></body></html>")


HOME = _page("The Vascular Center Assistant", f"""
<h1>The Vascular Center: WhatsApp Assistant</h1>
<p>This is the automated WhatsApp assistant of Dr. Amol Lahoti's clinic, The Vascular Center,
Chhatrapati Sambhajinagar (Aurangabad). Website: <a href="https://dramollahoti.com">dramollahoti.com</a></p>
<p><a href="/privacy">Privacy Policy</a> · <a href="/data-deletion">Data Deletion Instructions</a></p>
""")


PRIVACY = _page("Privacy Policy", f"""
<h1>Privacy Policy</h1>
<p class="muted">The Vascular Center WhatsApp Assistant · Last updated {UPDATED}</p>

<p>This policy explains how The Vascular Center (Dr. Amol Lahoti's clinic, Chhatrapati Sambhajinagar
(Aurangabad), Maharashtra, India) handles information when you message our WhatsApp number.
Our WhatsApp assistant is automated. It answers questions about the clinic and helps arrange a call back
from our clinic team.</p>

<h2>Information we collect</h2>
<ul>
  <li>Your WhatsApp phone number and WhatsApp profile name.</li>
  <li>The text messages you send us and the replies we send.</li>
  <li>Details you choose to share: your name, city/area, health concern, how long you have had it,
      and your preferred appointment day/time.</li>
</ul>
<p>Please do not send sensitive documents or information you do not want us to store. The assistant
does not process voice notes, images or files.</p>

<h2>How we use it</h2>
<ul>
  <li>To reply to your questions about the clinic and its services.</li>
  <li>So our clinic team can call you to confirm an appointment.</li>
  <li>To keep the context of your conversation so you don't have to repeat yourself.</li>
</ul>
<p>We do not sell your information and we do not use it for advertising.</p>

<h2>Service providers</h2>
<p>We use these providers to run the assistant. They process data on our behalf:</p>
<ul>
  <li><b>Meta Platforms (WhatsApp Business Platform)</b>: to receive and send WhatsApp messages.</li>
  <li><b>Google (Gemini API)</b>: to generate the assistant's replies from your messages.</li>
  <li><b>Google (Google Sheets)</b>: to keep a list of appointment requests for our clinic team.</li>
  <li><b>Render</b>: to host the assistant's server.</li>
</ul>

<h2>Medical disclaimer</h2>
<p>The assistant shares general clinic information only. It does not diagnose or give medical advice.
In an emergency, call 108 or go to the nearest hospital.</p>

<h2>Retention</h2>
<p>We keep conversation and appointment-request details only as long as needed to respond to you and
manage your appointment, or until you ask us to delete them.</p>

<h2>Your choices</h2>
<p>You can stop messaging us at any time. You can ask us to access, correct or delete your information.
See <a href="/data-deletion">Data Deletion Instructions</a>.</p>

<h2>Contact</h2>
<p>Email: <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a><br>
The Vascular Center, Century Multispeciality Hospital, opposite Central Bus Stand, behind Hotel Ajinkya,
Kotwalpura, Chhatrapati Sambhajinagar (Aurangabad), Maharashtra.</p>
""")


DATA_DELETION = _page("Data Deletion Instructions", f"""
<h1>Data Deletion Instructions</h1>
<p class="muted">The Vascular Center WhatsApp Assistant · Last updated {UPDATED}</p>

<p>You can ask us to delete the information we hold about you from our WhatsApp assistant
(your phone number, profile name, messages and appointment-request details).</p>

<h2>How to request deletion</h2>
<ol>
  <li>Send an email to <a href="mailto:{CONTACT_EMAIL}?subject=Delete%20my%20WhatsApp%20data">{CONTACT_EMAIL}</a>
      with the subject <b>"Delete my WhatsApp data"</b>.</li>
  <li>Include the WhatsApp phone number you used to message us (with country code).</li>
</ol>
<p>Alternatively, message us on WhatsApp saying <b>"Please delete my data"</b>, and our clinic team will
process your request.</p>

<h2>What happens next</h2>
<p>We will delete your conversation history and appointment-request details from our systems and
confirm by email or WhatsApp within 30 days. Records that the law requires us to keep, such as medical
records from an actual clinic visit, are not covered by this request.</p>

<p><a href="/privacy">Privacy Policy</a></p>
""")


def insights_page(total: int, llm_n: int, route_rows: str, question_rows: str) -> str:
    menu_pct = 100 - (100 * llm_n // total if total else 0)
    return _page("Bot insights", f"""
<h1>Bot insights</h1>
<p class="muted">Which messages the menu answered for free, and which needed the AI.
Turn frequent AI questions into new menu answers in <code>knowledge/flows.yaml</code>.</p>
<p><b>{total}</b> messages · <b>{menu_pct}%</b> handled by the menu · <b>{llm_n}</b> sent to the AI</p>
<h2>By path</h2>
<table><tr><th>Path</th><th>Messages</th><th>Share</th></tr>{route_rows}</table>
<h2>Recent typed questions the menu couldn't handle (answered by AI, or by the menu-only reply when AI is off)</h2>
<table><tr><th>Time (UTC)</th><th>Phone</th><th>Message</th></tr>{question_rows}</table>
<style>table{{border-collapse:collapse;width:100%;margin:8px 0 24px}}
td,th{{border-bottom:1px solid #8884;padding:6px 8px;text-align:left;vertical-align:top}}
code{{font-size:.9em}}</style>
""")


# ---------------------------------------------------------------- staff inbox (/admin/chats)

_INBOX_STYLE = """
<style>
  .row { display:block; padding:12px 4px; border-bottom:1px solid #8883; text-decoration:none; color:inherit; }
  .row:hover { background:#8881; }
  .top { display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
  .name { font-weight:600; } .when { color:var(--muted); font-size:.8rem; white-space:nowrap; }
  .last { color:var(--muted); font-size:.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tag { display:inline-block; font-size:.72rem; padding:1px 7px; border-radius:9px; margin-left:6px;
         border:1px solid #8886; font-weight:600; }
  .Hot { color:#c0392b; border-color:#c0392b; } .Warm { color:#b9770e; border-color:#b9770e; }
  .Cold { color:var(--muted); } .ok { color:var(--accent); border-color:var(--accent); }
  .paused { color:#7d3cb5; border-color:#7d3cb5; }
  .chat { display:flex; flex-direction:column; gap:8px; margin:16px 0; }
  .msg { max-width:82%; padding:8px 11px; border-radius:12px; white-space:pre-wrap; word-wrap:break-word;
         font-size:.95rem; }
  .user { align-self:flex-start; background:#8882; }
  .assistant { align-self:flex-end; background:color-mix(in srgb, var(--accent) 18%, transparent); }
  .staff { align-self:flex-end; background:color-mix(in srgb, #7d3cb5 22%, transparent); }
  .meta { font-size:.7rem; color:var(--muted); margin-top:3px; }
  .facts { font-size:.9rem; color:var(--muted); }
  textarea { width:100%; box-sizing:border-box; min-height:80px; font:inherit; padding:8px;
             border-radius:8px; border:1px solid #8886; background:transparent; color:inherit; }
  button { font:inherit; padding:8px 14px; border-radius:8px; border:1px solid var(--accent);
           background:var(--accent); color:#fff; cursor:pointer; }
  button.secondary { background:transparent; color:var(--accent); }
  .note { padding:8px 11px; border-radius:8px; background:#8882; font-size:.9rem; margin:10px 0; }
  .bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:10px 0; }
</style>
"""


def _esc(value) -> str:
    import html
    return html.escape("" if value is None else str(value))


def _short_time(ts: str) -> str:
    return _esc((ts or "")[:16].replace("T", " "))


def chats_list_page(rows: list[dict], now_ts: float) -> str:
    items = []
    for r in rows:
        d = r["data"] or {}
        name = d.get("name") or r.get("profile_name") or ("…" + r["phone"][-4:])
        tags = ""
        if d.get("status") in ("Hot", "Warm", "Cold"):
            tags += f'<span class="tag {_esc(d["status"])}">{_esc(d["status"])}</span>'
        if r["details_confirmed"]:
            tags += '<span class="tag ok">Booked</span>'
        if (d.get("_human_until") or 0) > now_ts:
            tags += '<span class="tag paused">Staff</span>'
        who = "Patient: " if r["last_role"] == "user" else "Bot: "
        items.append(
            f'<a class="row" href="/admin/chats/{_esc(r["phone"])}">'
            f'<div class="top"><span class="name">{_esc(name)}{tags}</span>'
            f'<span class="when">{_short_time(r["last_at"])}</span></div>'
            f'<div class="last">{who}{_esc((r["last_text"] or "")[:120])}</div></a>')
    body = "".join(items) or '<p class="muted">No conversations yet.</p>'
    return _page("Chats", f"""
<meta http-equiv="refresh" content="30">
<h1>Chats</h1>
<p class="muted">Newest first · times in UTC · refreshes every 30 s</p>
{body}{_INBOX_STYLE}
""")


def chat_page(phone: str, lead: dict, messages: list[dict], can_reply: bool, paused: bool,
              csrf: str, flash: str = "") -> str:
    d = lead.get("data") or {}
    name = d.get("name") or lead.get("profile_name") or ("…" + phone[-4:])
    facts = " · ".join(f"{label}: {_esc(d[key])}" for key, label in
                       (("city", "City"), ("concern", "Concern"), ("duration", "Since"),
                        ("preferred_time", "Preferred"), ("status", "Status"), ("_ad", "Ad"))
                       if d.get(key))
    bubbles = []
    for m in messages:
        text = m["content"] or ""
        cls = m["role"]
        if cls == "assistant" and text.startswith("[Clinic staff]"):
            cls, text = "staff", text[len("[Clinic staff]"):].strip()
        label = {"user": "Patient", "assistant": "Bot", "staff": "Clinic staff"}[cls]
        bubbles.append(f'<div class="msg {cls}">{_esc(text)}'
                       f'<div class="meta">{label} · {_short_time(m["created_at"])}</div></div>')
    flash_html = f'<div class="note">{_esc(flash)}</div>' if flash else ""
    pause_btn = (f'<form method="post" action="/admin/chats/{_esc(phone)}/resume">'
                 f'<input type="hidden" name="csrf" value="{_esc(csrf)}">'
                 f'<button class="secondary">Resume bot</button></form>') if paused else (
                 f'<form method="post" action="/admin/chats/{_esc(phone)}/pause">'
                 f'<input type="hidden" name="csrf" value="{_esc(csrf)}">'
                 f'<button class="secondary">Pause bot (staff take over)</button></form>')
    if can_reply:
        reply = (f'<form method="post" action="/admin/chats/{_esc(phone)}/reply">'
                 f'<input type="hidden" name="csrf" value="{_esc(csrf)}">'
                 f'<textarea name="text" maxlength="4000" placeholder="Type a reply… (sending pauses the bot for this patient)" required></textarea>'
                 f'<div class="bar"><button>Send on WhatsApp</button></div></form>')
    else:
        reply = ('<div class="note">The patient\'s last message was more than 24 hours ago, so WhatsApp '
                 'does not allow a free-text reply. Call them instead, or wait until they message again.</div>')
    return _page(f"Chat with {name}", f"""
<p><a href="/admin/chats">← All chats</a></p>
<h1>{_esc(name)}{' <span class="tag paused">Staff handling</span>' if paused else ''}</h1>
<p class="facts">+{_esc(phone)}{(' · ' + facts) if facts else ''}</p>
<div class="bar"><a href="tel:+{_esc(phone)}">📞 Call</a> {pause_btn}</div>
{flash_html}
<div class="chat">{''.join(bubbles) or '<p class="muted">No messages.</p>'}</div>
{reply}
{_INBOX_STYLE}
""")
