# Cowork prompt: make the clinic WhatsApp bot production-grade on open-source models

Copy everything below the line into Claude Cowork.

---

You are helping me make my WhatsApp lead-generation bot **production-grade**, moving it from Google Gemini to **free open-source LLMs**. Work step by step. Show me a short plan first and wait for my "go". Then implement, test and deploy. Pause and ask me whenever you need an account login, a payment, or a decision.

## Security rules (strict)
- **Never ask me to paste API keys, tokens, passwords or secrets into the chat.** When a secret is needed, open the right page in the browser, click into the field, and STOP so I can type or paste it myself.
- Never commit secrets to git. Secrets live only in Render's Environment settings (and in a local `.env` that is git-ignored).
- Never print secrets in logs or in your messages.

## Context: what already exists
- **Repo:** `https://github.com/i5acheen/claudeprojects`, branch `claude/whatsapp-vascular-clinic-mvp-inqj2i`, folder `whatsapp-clinic-bot/`. Clone it locally and work on that branch.
- **Business:** Dr. Amol Lahoti, The Vascular Center, Chhatrapati Sambhajinagar (Aurangabad). Varicose veins and endovascular treatment. The bot answers patients in Marathi, Hindi or English, and collects leads: name, city, concern, duration, preferred time, Hot/Warm/Cold status.
- **Stack:** Python 3.11, FastAPI, WhatsApp Cloud API webhook, SQLite (chat history and lead state), Google Sheets lead log (optional), deployed on **Render free** at `https://vascular-clinic-whatsapp-bot.onrender.com`. Render auto-deploys from the branch above, with Root Directory `whatsapp-clinic-bot`.
- **Key files:**
  - `app/main.py`: webhook (GET verify, POST with X-Hub-Signature-256 check), background processing, `/health`, `/privacy`, `/data-deletion`, and protected test pages `/diag/gemini` and `/diag/chat`
  - `app/agent.py`: language picker (मराठी/हिंदी/English buttons) with a locked language, history to LLM to reply, tap-to-choose options (buttons/lists), lead merge, Sheets sync
  - `app/llm.py`: Gemini client with a JSON schema (`AgentTurn`: reply, language, lead, details_confirmed, options) and a fallback model chain
  - `app/whatsapp.py`: payload parsing (text, button and list replies) and sending text and interactive messages
  - `app/db.py`, `app/sheets.py`, `app/config.py` (all settings from env vars)
  - `prompts/system_prompt.md`: bot behaviour (conversion playbook, safety, language, options)
  - `knowledge/clinic_info.md`: clinic facts. **Never invent facts.** Keep the [TO BE FILLED] placeholders.
  - `tests/`: pytest suite. It must stay green.
- **Current problems:** Gemini free-tier quotas run out daily (429) and the newest models return 503 "high demand". Render free sleeps after 15 minutes and wipes the disk on restart, so chat memory is lost. The WhatsApp token is temporary (expires every 24 hours).

## Goals
### 1. Provider-agnostic LLM layer with free open-source models
- Replace the Gemini-only client with an **OpenAI-compatible client** (use the `openai` Python package with a custom `base_url`) that supports a **chain of providers and models**, tried in order:
  1. **OpenRouter** free open-source models (`:free` suffix, e.g. Llama, Qwen, Gemma, DeepSeek or gpt-oss variants). **Check OpenRouter's live model list** for which `:free` models exist today. Don't rely on memory.
  2. **Groq** free tier (fast Llama/Qwen models). Note its tokens-per-minute cap.
  3. **Cerebras** free tier.
  4. Keep **Gemini** as the last fallback (existing code).
- Config via env: `LLM_CHAIN` (e.g. `openrouter:meta-llama/...:free,groq:llama-...,gemini:gemini-3.5-flash-lite`), plus `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `GEMINI_API_KEY`. A provider with no key is skipped.
- **Structured output:** many free models don't support strict JSON schemas. Use JSON mode where available, otherwise instruct "reply with JSON only", then **parse leniently** (strip ```json fences, extract the first {...}), **validate with the pydantic `AgentTurn`**, and on failure try the next model. Never send raw JSON to a patient.
- Retry rules: on 429/5xx/timeout/invalid JSON, move to the next model. Retry the whole chain once after 3 seconds. 20-second timeout per call. Log which provider/model answered (no secrets).
- **Quality check before choosing the default order:** write a small script `scripts/eval_models.py` that sends 6 test conversations (Marathi, Romanized Marathi, Hindi, English, an emergency, and a cost/government-scheme question) to each candidate model and saves the replies to `eval_results.md`. Show me the results. Rank models on Marathi/Hindi quality, following the rules (short, one question, no invented facts), valid JSON, and speed. I will pick the default order.

### 2. Cut tokens per message (so free limits last longer)
- Today every call sends the full `system_prompt.md` plus `clinic_info.md` (about 7k tokens). Reduce it:
  - Split `clinic_info.md` into sections, and include only the core facts plus the sections relevant to the latest message (a simple keyword router is fine: varicose, DVT, cost, location, scheme…).
  - Keep the system prompt rules intact, but make them more concise. Don't drop any safety, honesty or "never invent facts" rule.
- Target: under 3.5k input tokens per call. Report before and after.

### 3. Persistent memory (free)
- Replace SQLite with **Postgres on Neon free tier** (`DATABASE_URL` env). Keep SQLite as the local and test default.
- Same tables: messages, processed_messages (dedupe), leads. Use the `psycopg` (v3) package or SQLAlchemy Core. Keep the existing `Database` interface so the agent code barely changes.
- Help me create the Neon account and database in the browser. I'll paste the connection string into Render myself.

### 4. Production hardening
- **Hot-lead alert:** when a lead becomes Hot or confirms details, notify the clinic team. Send a WhatsApp text to `ALERT_PHONE` (free inside a 24-hour window only, so also support email via SMTP: `ALERT_EMAIL`, `SMTP_*` env vars). Include name, phone, concern, preferred time and summary. Send once per lead per status change.
- **Disable the `/diag/*` endpoints unless `ENABLE_DIAG=true`.**
- **Per-user rate limit** (e.g. max 20 messages per 10 minutes) so spam can't drain LLM quota.
- **Graceful fallback:** if every model fails, send the bilingual "technical issue, please call +91 99711 21273" message and alert the team.
- **Health check:** `/health` stays cheap. Add `/ready`, which checks the database connection.
- **Structured logging:** one line per message with the phone's last 4 digits only, provider/model used, latency and outcome. No message content in production logs.
- Keep the webhook signature check, the dedupe, and the fast 200 response with background processing.

### 5. Keep it awake and set up permanent access (guide me in the browser)
- **cron-job.org:** create a job that opens `/health` every 10 minutes (keeps Render free awake).
- **Permanent WhatsApp token:** Meta Business Settings → System users → create `clinic-bot` (Admin) → assign the app and the WhatsApp account → generate a token that never expires, with `whatsapp_business_messaging` and `whatsapp_business_management`. I'll paste it into Render as `WHATSAPP_TOKEN` myself.
- **OpenRouter account:** create it. Tell me about the optional one-time $10 credit (it raises free limits from 50 to 1,000 requests per day). I'll decide on the payment.
- **Groq and Cerebras accounts:** create them and generate API keys. I'll paste the keys into Render myself.
- **Rotate secrets** that were exposed earlier: Meta App secret (Reset), Gemini key, and `VERIFY_TOKEN`. Update Render and the Meta webhook settings together.

### 6. Tests, docs, deploy
- Add pytest tests for: the provider chain fallback (fake providers: 429 → next; invalid JSON → next), lenient JSON parsing, the knowledge router, Postgres/SQLite parity (SQLite in tests), the rate limiter, Hot-lead alert de-duplication, and diag disabled by default. Run the whole suite, and keep all existing tests passing.
- Update `README.md` and `.env.example` with every new env var (placeholders only).
- Commit in small logical commits on the same branch and push. Render auto-deploys.
- After the deploy: check `/health` and `/ready`, then ask me to send "hi" from WhatsApp, and verify the language picker, a Marathi conversation with buttons, a cost question, and a booking summary. Check the Render logs show which model answered.

## Bot behaviour that must not change
- First message gets the language picker. The chosen language stays locked unless the patient explicitly asks to switch.
- Warm, natural front-desk tone. Short WhatsApp messages, one question at a time, tap-to-choose options where they fit.
- Answer only from `knowledge/clinic_info.md`. No invented prices, timings, success claims or guarantees. [TO BE FILLED] means "the team will tell you on the call".
- Don't announce being a bot, but **answer honestly if a patient sincerely asks whether they are talking to a person**. Never claim to be human.
- No diagnosis or prescriptions. Emergencies (breathlessness, chest pain, stroke signs, heavy bleeding, a cold or blue foot) get "call 108 / go to emergency now".
- Share the YouTube channel and the Google Maps location as described in the prompt.

## When you're done, give me
1. A summary of what changed, and the final model order with the evaluation results.
2. Token usage per message, before and after.
3. The list of env vars I must set in Render (names only), and which ones are still empty.
4. Any remaining [TO BE FILLED] items and manual steps for me.
