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
