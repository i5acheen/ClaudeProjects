# Neha: open-source voice agent (Marathi)

The "Neha" phone agent from the Bolna pilot, running on **open-source Bolna** (MIT, github.com/bolna-ai/bolna)
on our own server. Same prompt, same Sarvam Marathi voice, about ₹1–1.5/min instead of ₹5.5/min.

| Part | What we use | Cost |
|---|---|---|
| Call engine | Bolna open source (pinned commit in `requirements.txt`) | free |
| Listening (STT) | Sarvam `saaras:v4`, Marathi | Sarvam credit (₹100 free on sign-up ≈ 15–20 two-minute test calls; ~₹30/hr listening + ₹3 per 1,000 chars voice) |
| Brain (LLM) | Gemini `gemini-3.5-flash-lite` (also used for the end-of-call check and the result summary) | free tier |
| Voice (TTS) | Sarvam `bulbul:v3`, voice `kavya`, Marathi | Sarvam credit |
| Phone line | Plivo | ~₹0.38/min + number rental |

```
voice/
├── agent/neha_agent.json     # engine settings: voice, listening, pauses, interruptions, hang-up rules
├── agent/neha_prompt_mr.md   # Neha's Marathi prompt (free-treatment-first, safety rules)
├── agent/welcome_mr.txt      # first sentence of every call
├── agent_config.py           # loads the above for each call, fills {{patient_name}} etc.
├── server.py                 # FastAPI: POST /calls, Plivo callbacks, live audio websocket, mic test
├── tests/test_voice.py       # validates the config against the real Bolna engine + server checks
├── Dockerfile, requirements.txt, .env.example
```

To change what Neha says, edit `agent/neha_prompt_mr.md` or `agent/welcome_mr.txt`. The next call uses the new text, with no rebuild of the logic.

---

## Step 1. Accounts and keys (all secrets go in `.env` only; never paste them in chat)
1. **Sarvam:** sign up at https://dashboard.sarvam.ai → API key → `SARVAM_API_KEY`. The free credit is ₹100; keep **auto top-up off** during testing.
2. **Gemini:** a **free-tier** key → `GOOGLE_API_KEY`. In AI Studio, check that the key's project shows "Free tier", not a billed or prepaid tier.
3. **Plivo:** needed only for real phone calls (Step 3). Sign up at https://www.plivo.com, which gives trial credit. Copy Auth ID/Token → `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`. Buy or rent an Indian number (KYC needed) → `PLIVO_PHONE_NUMBER`. On a trial, calls only go to numbers you verify in Plivo.

## Step 2. ₹0 test: talk to Neha from your laptop microphone
Needs Python 3.11 on your laptop (on a Mac, also `brew install portaudio`).
```bash
cd whatsapp-clinic-bot/voice
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # fill SARVAM_API_KEY, GOOGLE_API_KEY; set ENABLE_MIC_TEST=true
uvicorn server:app --port 5001
```
In a second terminal (same folder, venv active):
```bash
pip install pyaudio sounddevice websockets numpy
curl -O https://raw.githubusercontent.com/bolna-ai/bolna/8c6dea525ae1e6ef24ca7f9568eb83c7e272ad5b/local_setup/quickstart_client.py
ASSISTANT_ID=neha python quickstart_client.py
```
**If `python3.11 -m venv .venv` fails at `ensurepip` (common with Homebrew Python on Mac):** use `uv` instead:
```bash
brew install uv
rm -rf .venv && uv venv --python 3.11 .venv && source .venv/bin/activate
uv pip install -r requirements.txt     # and later: uv pip install pyaudio sounddevice websockets numpy
```

Use headphones so Neha doesn't hear herself. Speak Marathi. When you stop, the call result is saved to `data/calls.jsonl`.
It records the outcome (booked / call back / not interested…), preferred day and time, scheme card, and a summary.

## Step 3. Real phone calls
1. Deploy this folder on a small always-on server: any VPS (₹500–800/month) with Docker, or a platform that supports **websockets and no sleeping**. Render's free plan sleeps, so it won't work.
   ```bash
   docker build -t neha-voice . && docker run -d --env-file .env -p 5001:5001 neha-voice
   ```
   Put HTTPS in front (e.g. Caddy or the platform's URL) and set `PUBLIC_URL=https://…`.
2. Set `VOICE_API_TOKEN` (`openssl rand -hex 24`) and keep `ENABLE_MIC_TEST=false`.
3. Place a test call to **your own number**:
   ```bash
   curl -X POST "$PUBLIC_URL/calls" -H "X-Voice-Token: $VOICE_API_TOKEN" -H "Content-Type: application/json" \
     -d '{"phone":"91XXXXXXXXXX","patient_name":"सचिन","concern":"पायाच्या शिरा फुगणे","call_reason":"WhatsApp वर कॉलसाठी विनंती"}'
   ```
   - Calls are refused outside **9am–8pm IST** (`CALL_START_HOUR` / `CALL_END_HOUR`).
   - Each call result is saved to `data/calls.jsonl`. It is also POSTed, signed with `RESULT_WEBHOOK_SECRET` (`X-Signature-256`), to `RESULT_WEBHOOK_URL`.

## Step 4 (next build). Connect to the WhatsApp bot
- WhatsApp "📞 Call me" consent button → bot calls `POST /calls`.
- The bot's `/voice/result` endpoint receives the outcome → lead, Google Sheet, email alert.

## Tuning (same knobs as the hosted Bolna dashboard, in `agent/neha_agent.json`)
| Problem | Setting |
|---|---|
| Cuts the patient off | raise `incremental_delay` (700 → 900 ms) |
| Stops for a cough or "हं" | raise `number_of_words_for_interruption` (2 → 3) |
| Too fast or slow | `synthesizer.provider_config.speed` (0.9–1.0) |
| Different voice | `VOICE_TTS_VOICE=priya` in `.env` (or `kavya`, `ritu`) |
| Mishears names | add words to `transcriber.keywords` |
| Hangs up too early or late | `hangup_after_silence`, `call_cancellation_prompt` |

## Rules built in
- Calls only within the set hours. `POST /calls` needs a secret token. Each call link is single-use and expires after 10 minutes.
- Neha says she is an automated assistant. She never promises the scheme will cover a patient, never invents urgency, and says "call 108" for emergency symptoms.
- Only call patients who **said yes** to a call. The WhatsApp consent button (Step 4) enforces this.

## Tests
```bash
pip install pytest && python -m pytest -q tests
```
