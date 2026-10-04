# The Vascular Center: WhatsApp Lead Assistant

A free WhatsApp assistant for Dr. Amol Lahoti's clinic. It answers questions from
`knowledge/clinic_info.md` in Marathi, Hindi or English. It also collects lead details
(name, city, concern, duration, preferred time) and logs them to Google Sheets.

**Stack:** Python 3.11 · FastAPI · WhatsApp Cloud API · free open-source LLMs (OpenRouter / Groq / Cerebras) with Gemini fallback · Postgres (Neon) or SQLite · gspread · Render

```
whatsapp-clinic-bot/
├── app/
│   ├── main.py        # FastAPI: GET/POST /webhook, /health
│   ├── config.py      # reads .env
│   ├── security.py    # X-Hub-Signature-256 check
│   ├── whatsapp.py    # parse webhook payloads, send replies (Graph API)
│   ├── llm.py         # LLM fallback chain (OpenRouter/Groq/Cerebras/Gemini) + JSON parsing
│   ├── agent.py       # language picker, history → LLM → reply/options, lead update, alerts
│   ├── knowledge.py   # sends only the relevant parts of clinic_info.md (smaller prompts)
│   ├── alerts.py      # hot-lead / failure alerts (WhatsApp, email) + per-user rate limit
│   ├── db.py          # Postgres (DATABASE_URL) or SQLite: history, dedupe, lead state
│   └── sheets.py      # Google Sheets lead upsert (one row per phone)
├── prompts/system_prompt.md   # ← edit the bot's behaviour here
├── knowledge/clinic_info.md   # ← edit clinic facts here (fill the [TO BE FILLED] items!)
├── scripts/eval_models.py  # compare models on real clinic conversations
├── tests/
├── data/              # SQLite DB (git-ignored)
├── credentials/       # service-account JSON (git-ignored)
├── .env.example
└── requirements.txt
```

Edits to `system_prompt.md` and `clinic_info.md` take effect on the next message. You don't need to restart.

---

## 1. Install

```bash
cd whatsapp-clinic-bot
python3.11 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then fill in the values below
```

## 2. AI models (free open-source first)
The bot tries models in order and moves to the next one if a model is rate-limited, down, slow or returns broken output. Set **at least one** key; providers without a key are skipped.

| Provider | Get a key | Free tier |
|---|---|---|
| OpenRouter | https://openrouter.ai/keys | `:free` models: 50 req/day, 1,000/day after a one-time $10 credit |
| Groq | https://console.groq.com/keys | about 1,000 req/day, low tokens/minute |
| Cerebras | https://cloud.cerebras.ai | about 1M tokens/day |
| Gemini | https://aistudio.google.com/apikey | small daily quota per model (last fallback) |

The order is `LLM_CHAIN` (see `.env.example`). To compare models on real conversations, set `ENABLE_DIAG=true` and run `python scripts/eval_models.py --url <bot-url> --token <VERIFY_TOKEN>`. Then set `ENABLE_DIAG=false` again.

## 2b. Database (free, keeps chat memory)
Create a free Postgres database at https://neon.tech, copy its connection string, and set `DATABASE_URL` in Render. Without it the bot uses SQLite, which Render's free plan wipes on every restart.

## 3. Google Sheet + service account (free)
1. https://console.cloud.google.com → create a project → **APIs & Services → Library** → enable **Google Sheets API** and **Google Drive API**.
2. **IAM & Admin → Service Accounts → Create**. Open it → **Keys → Add key → JSON**. Save the file as `credentials/service_account.json`.
3. Create a Google Sheet. Click **Share** and add the service account's email (`...@...iam.gserviceaccount.com`) as **Editor**.
4. Copy the sheet ID from its URL (`/d/<ID>/edit`) into `GOOGLE_SHEET_ID`.
   The `Leads` tab and its header row are created automatically.

If Sheets is not configured, the bot still works and leads are kept in the database (`leads` table).

## 4. WhatsApp Cloud API (Meta test number)
1. https://developers.facebook.com → **My Apps → Create app** → type **Business** → add the **WhatsApp** product.
2. **WhatsApp → API Setup**:
   - Copy the **temporary access token** → `WHATSAPP_TOKEN` (it expires after 24h; for longer use, create a System User token in Business Settings).
   - Copy the **Phone number ID** → `PHONE_NUMBER_ID`.
   - Under "To", add your own WhatsApp number as a test recipient and verify it.
3. **App settings → Basic → App secret** → `APP_SECRET`.
4. Choose any random string for `VERIFY_TOKEN`, e.g. `openssl rand -hex 16`.

## 5. Run locally + expose with Cloudflare Tunnel

```bash
uvicorn app.main:app --port 8000
```

In a second terminal ([install cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)):

```bash
cloudflared tunnel --url http://localhost:8000
```

It prints a URL like `https://random-words.trycloudflare.com`. A free "quick tunnel" needs no account,
but **the URL changes every time you restart it**. When it changes, update it in Meta.

## 6. Connect the webhook in Meta
1. **WhatsApp → Configuration → Webhook → Edit**:
   - Callback URL: `https://<your-tunnel>.trycloudflare.com/webhook`
   - Verify token: the same `VERIFY_TOKEN` as in `.env`
2. Click **Verify and save**. Then under **Webhook fields**, **Subscribe** to `messages`.
3. Send "नमस्कार" from your test WhatsApp number to the Meta test number. 🎉

## 6b. Or deploy on Render (free, no laptop or tunnel needed)
1. Sign up at https://render.com with **GitHub** and allow Render to access this repo.
2. **New → Blueprint** → pick this repo. Render reads `render.yaml`.
3. Fill in the secret values when asked: `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `VERIFY_TOKEN`, `APP_SECRET`, `GEMINI_API_KEY`, `GOOGLE_SHEET_ID` (can be left blank for now).
4. (Optional, for Sheets) Service → **Environment → Secret Files** → add a file named `service_account.json` and paste the JSON key into it.
5. After the deploy, open `https://<your-service>.onrender.com/health`. It should show `{"ok":true}`.
6. In Meta, set the Callback URL to `https://<your-service>.onrender.com/webhook` (see step 6).

Free-plan limits:
- The service sleeps after 15 minutes idle, and the first reply after that takes about a minute. To keep it awake, add a free job at https://cron-job.org that opens `/health` every 10 minutes.
- The disk is wiped on every restart or redeploy. Set `DATABASE_URL` (Neon) so chat memory survives.

## 7. Tests

```bash
pytest -q
```

---

## How it works
- `POST /webhook` checks `X-Hub-Signature-256` against `APP_SECRET` (an invalid signature gets 403). It returns **200 immediately** and processes messages in the background. Status updates are ignored and duplicate message IDs are skipped.
- **First message:** a language picker (मराठी / हिंदी / English buttons). The chosen language is locked unless the person explicitly asks to switch.
- **Each reply:** the last `HISTORY_LIMIT` messages, the lead details and only the relevant parts of `clinic_info.md` (about 3.5–4.5k tokens) go through the LLM chain. The model returns JSON: `reply`, `language`, `lead{…}`, `details_confirmed` and `options` (WhatsApp buttons or list).
- The lead is merged (new values never erase old ones), saved, and upserted to Google Sheets. **Hot** or **confirmed** leads trigger a one-time alert to `ALERT_PHONE` / `ALERT_EMAIL`.
- If every model fails, the patient gets a polite "please call the clinic" message and the team is alerted.
- Spam protection: at most `RATE_LIMIT_COUNT` messages per user per `RATE_LIMIT_WINDOW_SECONDS`.
- `GET /health` is a cheap liveness check (use it for cron-job.org pings). `GET /ready` also checks the database.
- `/diag/llm` and `/diag/chat` test pages exist only when `ENABLE_DIAG=true`, and need `VERIFY_TOKEN`.

## Privacy note
This handles patient health information. Keep `.env`, `credentials/` and `data/` private,
restrict who can see the Google Sheet, and tell patients how their data is used.
