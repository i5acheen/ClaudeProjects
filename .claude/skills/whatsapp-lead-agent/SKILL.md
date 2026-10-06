---
name: whatsapp-lead-agent
description: Set up a WhatsApp lead-generation assistant for any business (clinic, coaching class, salon, real-estate, shop…), end to end. Covers building the knowledge base from the business website, customising the tap menu and AI prompt, Meta WhatsApp Cloud API setup (developer app, test number, webhook, publishing, permanent token, real number), deploying on Render, free open-source LLMs with Gemini fallback, Neon Postgres, Google Sheets lead log, Google Calendar appointment slots, email/WhatsApp alerts, testing, troubleshooting and go-live. Use when someone wants a WhatsApp bot, a WhatsApp booking assistant, or to copy this agent for another business.
---

# WhatsApp Lead Agent: setup playbook

This skill sets up the WhatsApp assistant in `whatsapp-clinic-bot/` for **any business**. It was first built for a medical clinic (The Vascular Center, Aurangabad), and everything business-specific lives in a few editable files.

**What the finished agent does**
- Greets in the customer's language (buttons: e.g. मराठी / हिंदी / English) and keeps that language.
- Shows a **tap menu**: book, about the problem/service, pricing, location, about the owner, videos, call-back, other question. Fixed answers and the booking questions run **without AI**: instant, free, and nothing invented.
- **Books appointments**: date → morning/evening → free time slot, optionally from Google Calendar (tentative event created).
- Sends typed questions the menu can't answer to an **LLM chain** (free open-source models first, Gemini last).
- Saves leads (name, city, need, timeline, preferred time, Hot/Warm/Cold) to the database and **Google Sheets**, and **alerts the team** by email/WhatsApp.
- Shows **/admin/insights**: menu vs AI share, and the questions that needed the AI.

---

## 0. Rules while doing this (important)
1. **Never ask the user to paste secrets into chat** (tokens, API keys, app secret, passwords, service-account JSON). Open the right page, tell them where to click, and let them paste the value directly into Render or `.env`. If they paste one anyway, tell them to rotate it after setup.
2. **Never invent business facts.** Use only the business website and what the owner states. Everything missing becomes `[TO BE FILLED]`, which the bot answers with "our team will tell you on the call".
3. Never commit `.env`, `credentials/` or `data/`.
4. Ask before anything that costs money or publishes something (paid plans, OpenRouter credit, Meta payment method, going live).
5. **Honesty:** the bot doesn't announce it's a bot, but it must answer truthfully if someone sincerely asks whether they're talking to a person. Never configure it to claim to be human (WhatsApp policy and basic trust).
6. Medical, legal and financial businesses: keep the "no diagnosis or advice, emergencies call 108/112" rules in the prompt.

---

## 1. Collect business details (ask the owner)
- Business name, owner/doctor name, one-line description, years of experience, customers served
- Website, YouTube/Instagram, Google Maps link, address with landmarks, phone numbers, email
- Services/products, process, typical price ranges (only if they agree to share), insurance or schemes, offers
- **Opening days and hours**, holidays, appointment length (for slots)
- Languages customers use (default here: Marathi, Hindi, English)
- Who receives lead alerts (email and/or a staff WhatsApp number)
- Lead qualification fields to collect (default: name, city, need, how long, preferred time)

## 2. Build the knowledge and content files
Copy the project, or work in it directly. Business-specific files:

| File | What to change |
|---|---|
| `knowledge/clinic_info.md` | All business facts (fetch the website pages and extract them). Mark gaps `[TO BE FILLED]`, and facts that may be outdated `[CONFIRM]`. Keep `##`/`###` headings, because the knowledge router splits on them. |
| `app/knowledge.py` | `CORE` headings always sent, and `TOPICS` keyword lists per section (English, Romanized and native script). Update them to match your headings. |
| `knowledge/flows.yaml` | Welcome, menu items, fixed answers, problem/service list, durations, call-back times, **schedule (days, sessions, slot minutes, holidays)**, booking prompts and buttons, in every language. WhatsApp limits: list title ≤24 characters, description ≤72, button ≤20, list ≤10 rows, buttons ≤3. |
| `prompts/system_prompt.md` | Role, tone, conversion flow, honesty, safety, lead status rules, output JSON. Replace clinic wording with the business. |
| `app/pages.py` | Business name, address, contact email in the Privacy Policy and Data Deletion pages (Meta requires both). |
| `assets/app_icon_1024.png` | 1024×1024 icon for the Meta app (the business logo is best). |
| `CLINIC_PHONE` env | Number shown in the "technical issue, please call" fallback. |

Run `pytest -q`. `tests/test_flows.py` checks every menu title against WhatsApp's length limits in all languages.

## 3. Meta WhatsApp Cloud API (free test number)
1. https://developers.facebook.com → **My Apps → Create App** → type **Business** → add **WhatsApp** (Use cases → "Connect on WhatsApp").
2. **WhatsApp → API Setup** (Step 1 "Try it out"):
   - Meta gives a free **test number** (+1 555 …). Copy the **Phone Number ID** (not the number itself), which goes into `PHONE_NUMBER_ID`.
   - **Generate access token**, which goes into `WHATSAPP_TOKEN`. ⚠️ It expires in about 24 hours (see step 10 for a permanent one).
   - **Recipient → Manage phone number list**: add the tester's own WhatsApp number (max 5 for a test number) and verify the code.
   - Send the sample "Hello World" template to confirm delivery.
3. **App settings → Basic → App secret → Show** goes into `APP_SECRET` (it validates `X-Hub-Signature-256`).
4. Choose any random `VERIFY_TOKEN` (no spaces; case-sensitive). The same value goes in Render and in Meta.

## 4. Deploy on Render (free)
1. Render → sign up with GitHub → **New → Web Service** → pick the repo. (A Blueprint from `render.yaml` also works if the bot is at the repo root.)
2. Settings:
   - Branch: the branch with the code
   - **Root Directory:** `whatsapp-clinic-bot` (if the bot is in a subfolder)
   - Runtime: Python 3 · Region: closest to the customers (Singapore for India)
   - **Build:** `pip install -r requirements.txt`
   - **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (check the spelling: `uvicorn`)
   - Instance: Free · Health check path: `/ready`
3. **Environment** ("Add from .env" accepts a pasted block). The minimum is: `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `VERIFY_TOKEN`, `APP_SECRET`, at least one LLM key (step 6), `CLINIC_PHONE`, and `PYTHON_VERSION=3.11.9`. The full list is in `.env.example`.
4. Deploy and open `https://<service>.onrender.com/health`, which should show `{"ok":true}`. `/ready` also checks the database.
5. **Keep it awake:** Render free sleeps after 15 minutes (the first reply then takes about 1 minute). At https://cron-job.org, create a job that opens `/health` every 10 minutes.

## 5. Connect the webhook and publish the Meta app
1. Meta → Use cases → Customize → **Step 2 Production setup → Configure Webhooks** (or WhatsApp → Configuration):
   - Callback URL: `https://<service>.onrender.com/webhook`
   - Verify token: the same `VERIFY_TOKEN`
   - **Verify and save**. The Render log should show `GET /webhook?hub.mode=subscribe… 200`.
2. **Webhook fields → `messages` → Subscribed.** Tap **Test** next to it: `POST /webhook 200` means the App secret is right, and `403` means it's wrong.
3. **Publish the app.** Unpublished apps receive only dashboard test webhooks, not real messages:
   - App settings → Basic: **Privacy Policy URL** = `https://<service>.onrender.com/privacy`, **Data deletion instructions URL** = `https://<service>.onrender.com/data-deletion` (the full URL with the path), **App icon** 1024×1024, **Category**, then Save.
   - Left menu → **Publish**.
4. If messages still don't arrive (no `POST /webhook` in the logs), subscribe the WhatsApp Business Account to the app once: Graph API Explorer → select the app → Generate token (whatsapp_business_management) → **POST** `<WABA_ID>/subscribed_apps` → `{"success": true}`.
5. Send "hi" from the verified number. You should get the language buttons, then the menu.

## 6. AI models (free open-source first)
The bot uses `LLM_CHAIN` (see `app/config.py` `DEFAULT_LLM_CHAIN`) and skips providers that have no key. Set any of:
- `OPENROUTER_API_KEY`: https://openrouter.ai/keys. `:free` models allow 50 requests/day, or 1,000/day after a one-time $10 credit. Check the live free list at `https://openrouter.ai/api/v1/models` (ids ending `:free`), because models change.
- `GROQ_API_KEY`: https://console.groq.com/keys (fast; low tokens/minute).
- `CEREBRAS_API_KEY`: https://cloud.cerebras.ai (about 1M tokens/day).
- `GEMINI_API_KEY`: https://aistudio.google.com/apikey. New keys start with **`AQ.`**, which is normal (auth keys since May 2026). The free quota is small and per model. Newest models often return 503 "high demand", and older ones (e.g. 2.5-flash) return 404 for new users. The chain handles all of that.
- Compare models: set `ENABLE_DIAG=true`, then run `python scripts/eval_models.py --url <bot-url> --token <VERIFY_TOKEN>` and reorder `LLM_CHAIN` by the results. Turn `ENABLE_DIAG` off afterwards.
- Don't use free tiers that train on your data (e.g. Mistral's free Experiment tier) for customer chats.

## 7. Database (keeps chat memory)
Render free wipes its disk on every restart. Create a free Postgres at https://neon.tech (region near the customers), copy the connection string, and put it in Render as `DATABASE_URL`. Without it, SQLite is used (fine for local runs and tests).

## 8. Lead sheet, calendar and alerts (optional)
**Google service account** (used by both Sheets and Calendar):
1. https://console.cloud.google.com → new project → enable **Google Sheets API**, **Google Drive API** and **Google Calendar API**.
2. IAM & Admin → Service Accounts → Create → Keys → **Add key → JSON** (download it).
3. Render → Environment → **Secret Files** → `service_account.json` (paste the JSON there), and set `GOOGLE_SERVICE_ACCOUNT_FILE=/etc/secrets/service_account.json`.

**Sheets:** create a sheet → Share it with the service-account email (Editor) → `GOOGLE_SHEET_ID` = the id from the URL. A `Leads` tab is created automatically, with one row per phone.

**Calendar:** Google Calendar → the business calendar → Settings and sharing → Share with specific people → the service-account email → **"Make changes to events"** → set `GOOGLE_CALENDAR_ID` (for the main calendar, it's the Gmail address). Set the real hours in `knowledge/flows.yaml → schedule`. Busy times are hidden, and confirmed requests become **tentative** events with the customer's details.

**Email alerts** (hot and confirmed leads, with name, phone, city, need and chosen slot): use Gmail with 2-Step Verification → **App Password**. Set `ALERT_EMAIL=<recipient>`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=<sending gmail>`, `SMTP_PASSWORD=<app password>`.
**WhatsApp alerts:** `ALERT_PHONE=<staff number with country code>`. These arrive only if that number messaged the bot in the last 24 hours (a WhatsApp rule), so set up email too.

## 9. Test checklist
- `/health` and `/ready` return `{"ok":true}`.
- "hi" gets the language buttons. Picking one gets the welcome and menu.
- Each menu item gives the right answer. Booking flow: problem → duration → name → city → date → slot → confirm → a sheet row, a calendar event and an email arrive.
- A typed question is answered by the AI, with a "☰ Menu" button.
- A voice note gets "please type". "menu" brings back the menu.
- "Are you a real person?" gets an honest answer. An emergency message gets the emergency number.
- `/admin/insights?token=<VERIFY_TOKEN>` shows the menu vs AI share and the AI questions. Move frequent ones into `flows.yaml`.

## 10. Go live with a real number
- **Permanent token:** business.facebook.com/settings → Users → **System users** → Add (Admin) → Assign assets (the app and the WhatsApp account, full control) → Generate token (expiry **Never**; `whatsapp_business_messaging`, `whatsapp_business_management`) → `WHATSAPP_TOKEN`.
- **Number options:**
  - (a) A new SIM or landline that isn't on WhatsApp: simplest, and bot-only.
  - (b) **Coexistence:** keep the existing WhatsApp Business app number, so staff and bot share it. See **section 10b** below.
  - (c) Delete the WhatsApp account on the existing number and register it on the API. Old chats are lost.
- Meta → WhatsApp Manager → **Add phone number** → display name (must match the business) → OTP → 2-step PIN → add a **payment card** → update `PHONE_NUMBER_ID`.
- **Business verification** (Business Settings → Security Centre): GST, Shop Act, Udyam or registration documents plus a matching website. Takes 2–10 days, and the display name shows once it's done.
- **Security before launch:** rotate any secret that was shared (App secret → Reset; new `VERIFY_TOKEN` in both Render and Meta; LLM keys). Set `ENABLE_DIAG=false`. Restrict who can open the sheet. Have the owner approve the facts and tone.

## 10b. Coexistence: use the existing WhatsApp Business app number
With coexistence, customers keep messaging the number they know. Staff keep using the **WhatsApp Business app** on the phone, and the bot answers through the Cloud API **on the same number**. It's available in India.

**Coexistence checklist (do these in order)**
1. Update the **WhatsApp Business app** on the business phone to **v2.24.17+**, and make sure that phone is the primary device.
2. Check the business has a **Meta Business portfolio** (business.facebook.com). Start **Business Verification** early, because it takes days.
3. Choose the onboarding route (details below): **(a)** a Meta partner that gives raw API access and a custom webhook *(recommended for one business)*, or **(b)** your own app as a Tech Provider.
4. Run the **Embedded Signup** link → log in → pick the business portfolio → **"Connect existing WhatsApp Business app"** → enter the number → on the phone, **approve sharing chat history (6 months) and contacts** (within 24 hours).
5. Note the new **Phone Number ID** and get a **permanent token** (System User for route b, or the partner's credentials for route a).
6. In Render, set `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID` and `HUMAN_HANDOFF_HOURS` (default 12). Keep `APP_SECRET` and `VERIFY_TOKEN` matching the app that receives the webhooks.
7. In Meta → Configure Webhooks: callback `https://<service>.onrender.com/webhook`, then subscribe **`messages`**, **`smb_message_echoes`**, `smb_app_state_sync` and `history`.
8. Re-link companion devices (WhatsApp Web or desktop on Mac). WhatsApp for Windows and Wear OS won't sync.
9. **Test:** a customer number sends "hi" and the bot replies. Staff reply from the phone, then the customer writes again, and the bot stays quiet (the log shows `Staff handling …, bot paused`). After `HUMAN_HANDOFF_HOURS`, the bot answers again.
10. Agree the staff rule (who answers what), and tell the team about the limitations below.

**Requirements**
- The number is on the **WhatsApp Business app** (not regular WhatsApp), **version 2.24.17 or newer**, and is the primary device.
- A Meta Business portfolio (Business Manager) for the business.
- ⚠️ Onboarding happens only through Meta's **Embedded Signup run by a Tech Provider or Solution Partner**. A plain developer app (like the test setup in section 3) can't turn coexistence on by itself.

**Two ways to onboard**
1. **Through a Meta partner that gives raw Cloud API access** and lets you set your own webhook URL (e.g. 360dialog; some Indian BSPs such as Gupshup/Interakt/AiSensy/WATI/DoubleTick also support coexistence, but check that they let you use your own webhook/bot rather than only their inbox). The partner sends an onboarding link. Then:
   - Open the link → log in with the business's Facebook account → select or create the business portfolio → choose **"Connect your existing WhatsApp Business app"** → enter the number.
   - On the phone, the WhatsApp Business app shows a prompt (or a QR code to scan) to **share chat history** (up to the last 6 months) and contacts. Accept it within the time limit.
   - Get the **Phone Number ID** and the partner's **API key**. In Render set:
     - `WHATSAPP_TOKEN` = the partner API key
     - `WHATSAPP_API_URL` = the partner's send-message endpoint (e.g. 360dialog: `https://waba-v2.360dialog.io/messages`)
     - `WHATSAPP_AUTH_HEADER` = the partner's key header (e.g. `D360-API-KEY`)
     - `WEBHOOK_URL_KEY` = a long random secret
   - In the partner dashboard, set the webhook URL to `https://<service>.onrender.com/webhook?key=<WEBHOOK_URL_KEY>`. Partners don't sign webhooks with your Meta App secret, so the bot accepts this secret URL instead.
   - Check in the partner's docs that their webhook payload is Meta's standard format (most Cloud API partners forward it as-is) and that `smb_message_echoes` is forwarded.
   - Partners usually charge a monthly fee.
2. **Become a Tech Provider yourself** (free, more work): in the Meta app dashboard, open **Become a Partner → Become Tech Provider**. You need **Business Verification** and **App Review** for advanced access to `whatsapp_business_management` and `whatsapp_business_messaging`. Then:
   - Create an **Embedded Signup configuration** with the WhatsApp Business app onboarding option (Facebook Login for Business → Configurations).
   - Host a small page with the Facebook JS SDK and an "Connect WhatsApp" button that launches it (session logging enabled).
   - Exchange the returned code for a business token. **Skip phone registration** (the number is already registered). Subscribe your app to the customer's WABA (`POST /<WABA_ID>/subscribed_apps`).
   - **Within 24 hours**, request history and contact sync (`POST /<PHONE_NUMBER_ID>/smb_app_data` with `sync_type` `history` and `smb_app_state_sync`), otherwise onboarding must be redone.

**Webhook fields to subscribe** (Meta → Configure Webhooks): `messages`, **`smb_message_echoes`** (replies staff type in the app), `smb_app_state_sync` (contacts) and `history` (past chats). The bot already handles `smb_message_echoes`: when staff reply from the phone, the bot **pauses for that customer for `HUMAN_HANDOFF_HOURS` (default 12)**, so there are no double replies. The staff message is added to the chat history, and `/admin/insights` shows `staff_reply` and `human` counts. The other two fields are acknowledged and ignored.

**Agree a working rule with staff.** For example: the bot answers first and books, and staff take over Hot leads by simply replying from the app. Or set `HUMAN_HANDOFF_HOURS` lower if staff only send short replies.

**Limitations to tell the business**
- Throughput is fixed at about **20 messages/second** (fine for a clinic).
- Not supported on the API side: group chats, broadcast lists, disappearing and view-once messages, live location, and voice/video calls through the API.
- **WhatsApp for Windows and Wear OS companions stop syncing.** Other linked devices must be re-linked after onboarding.
- Messages staff send from the app stay **free**. Messages the bot sends follow Cloud API pricing (customer-initiated replies are free; see section 11).
- **To undo:** in the WhatsApp Business app, go to **Settings → Account → Business Platform → Disconnect account**.

## 11. Costs (India, late 2026)
- WhatsApp: replies within 24 hours of the customer's message (text, buttons, lists) are **free**. Business-initiated templates: marketing about ₹0.86, utility about ₹0.115 (+18% GST). Customers who arrive from Click-to-WhatsApp ads open a free 72-hour window.
- Render free (with a cron ping) costs ₹0. Render Starter is about $7/month and doesn't sleep.
- LLMs: ₹0 on free tiers (one-time $10 on OpenRouter is recommended). Paid Gemini Flash costs about ₹1 per AI reply. The menu-first design keeps most messages AI-free.
- Neon, Sheets, Calendar, cron-job.org: free.

## 12. Troubleshooting (all seen in practice)
| Symptom | Cause → fix |
|---|---|
| Render: `uvcorn: command not found` | Typo in the Start Command. Use `uvicorn …`. |
| Render: `Missing required settings` | Environment variables not saved. Add them and redeploy. |
| Meta "callback URL or verify token couldn't be validated", log `GET /webhook … 403` | `VERIFY_TOKEN` differs between Meta and Render (case/spaces), or the deploy wasn't live yet. |
| Messages show grey ticks, no `POST /webhook` in the logs | `messages` field not subscribed, app **unpublished**, or the WABA isn't subscribed (step 5.4). |
| `POST /webhook 403` / "invalid signature" | Wrong `APP_SECRET` (the App ID or token was pasted instead). |
| `WhatsApp send failed 401` | Token expired (24 hours). Generate a new one, or use the permanent System User token. |
| `WhatsApp send failed … 131030` | The recipient isn't on the test number's allowed list. |
| Bot replies "technical issue" | Every LLM failed. Check `/diag/llm` (with `ENABLE_DIAG=true`) for 429 quota / 503 overload / 404 retired model, and add more providers to the chain. |
| Bot switches language | The language is locked after the picker. Check the `reply_language` context and that the patient didn't explicitly ask to switch. |
| Chat memory lost | No `DATABASE_URL`, so Render's free disk was wiped. Add Neon. |
| WhatsApp alert not received | The staff number hasn't messaged the bot in the last 24 hours. Use email alerts. |
| Staff and bot both reply (coexistence) | `smb_message_echoes` not subscribed in Meta webhook fields, so the bot never learns staff replied. |
| Calendar slots not filtered | `GOOGLE_CALENDAR_ID` not set, or the calendar isn't shared with the service account ("Make changes to events"). |

## 13. Project map
```
whatsapp-clinic-bot/
  app/main.py        webhook, /health, /ready, /privacy, /data-deletion, /admin/insights, /diag/*
  app/agent.py       language picker → menu flow → LLM fallback; saving, Sheets, alerts
  app/flows.py       menu, fixed answers, booking steps (reads knowledge/flows.yaml)
  app/scheduling.py  clinic hours → free slots; Google Calendar free/busy + tentative events
  app/llm.py         LLM chain (OpenRouter/Groq/Cerebras/Gemini) + lenient JSON parsing
  app/knowledge.py   sends only the relevant knowledge sections (smaller prompts)
  app/alerts.py      lead/failure alerts (WhatsApp, SMTP) + per-user rate limit
  app/db.py          Postgres (DATABASE_URL) or SQLite: messages, dedupe, leads, events
  app/sheets.py, app/whatsapp.py, app/security.py, app/pages.py, app/config.py
  knowledge/clinic_info.md, knowledge/flows.yaml, prompts/system_prompt.md
  scripts/eval_models.py, tests/ (pytest), .env.example, render.yaml, README.md
```
