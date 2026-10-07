# Cowork task list: set up everything for the Vascular Center assistants

Paste everything below the line into Claude Cowork. Work through it in order and tick each box.

---

You are helping me (Sachin) finish setting up two assistants for Dr. Amol Lahoti's clinic, The Vascular Center:
1. **WhatsApp lead bot:** already live on Render at https://vascular-clinic-whatsapp-bot.onrender.com. Code: GitHub repo `i5acheen/ClaudeProjects`, branch `claude/whatsapp-vascular-clinic-mvp-inqj2i`, folder `whatsapp-clinic-bot/`.
2. **"Neha" Marathi voice agent:** code in `whatsapp-clinic-bot/voice/` (open-source Bolna engine + Sarvam + Gemini + Plivo). Read `voice/README.md` first.

**Rules for you (Cowork):**
- **Never paste API keys, tokens or passwords into chat or into any file in GitHub.** Copy them only from the provider's dashboard straight into the Render or VPS *Environment* settings, or into my local `.env` file.
- **Stop and ask me** before anything that costs money, needs KYC or identity documents, or sends messages or calls to anyone other than me.
- Call or message only **my own number** for tests.
- After each section, write one line saying what was done and what's still pending.

## A. WhatsApp bot: production basics
- [ ] **A1. Permanent WhatsApp token.**
  - Meta Business Settings → System Users → create an admin system user.
  - Assign the WhatsApp app and the WhatsApp account.
  - Generate a token (no expiry) with `whatsapp_business_messaging` and `whatsapp_business_management`.
  - Put it in Render → Environment → `WHATSAPP_TOKEN`, then redeploy.
  - Check: send "hi" to the bot. It should reply with the language picker.
- [ ] **A2. Clinic phone in Render:** `CLINIC_PHONE=+91 96995 59301`. Redeploy.
- [ ] **A3. Free Postgres (Neon).**
  - Create a free project at https://neon.tech and copy the connection string into Render → `DATABASE_URL`.
  - Check: `https://vascular-clinic-whatsapp-bot.onrender.com/ready` returns `{"ok":true}`.
- [ ] **A4. Keep-alive.**
  - At https://cron-job.org, create a free job that opens `https://vascular-clinic-whatsapp-bot.onrender.com/health` every 10 minutes.
- [ ] **A5. Google service account (for Sheets + Calendar).**
  - Google Cloud Console → new project → enable **Google Sheets API**, **Google Drive API** and **Google Calendar API**.
  - IAM → Service Accounts → create one → Keys → JSON.
  - Upload the JSON to Render → Environment → **Secret Files** as `service_account.json`.
  - Set `GOOGLE_SERVICE_ACCOUNT_FILE=/etc/secrets/service_account.json`.
- [ ] **A6. Google Sheet.**
  - Share https://docs.google.com/spreadsheets/d/1Qwnv4_TMogjNnapUZUilk1xlerBfMaCDkxSez0MCecs/edit with the service-account email, as **Editor**.
  - Set `GOOGLE_SHEET_ID=1Qwnv4_TMogjNnapUZUilk1xlerBfMaCDkxSez0MCecs`.
  - Check: complete a booking in WhatsApp. A row should appear in the `Leads` tab.
- [ ] **A7. Calendar.**
  - Share the clinic Google Calendar with the service-account email, using "Make changes to events".
  - Set `GOOGLE_CALENDAR_ID` (the Calendar ID from its settings).
  - Check: a confirmed booking shows up as a tentative event.
- [ ] **A8. Email alerts** to sacheen501@gmail.com.
  - In the Gmail account that sends alerts: turn on 2-Step Verification → create an **App Password**.
  - Set `ALERT_EMAIL=sacheen501@gmail.com`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=<that gmail>`, `SMTP_PASSWORD=<app password>`.
  - Check: confirm a test booking, and an email should arrive.
- [ ] **A9. AI keys (optional; without them the bot runs menu-only).**
  - Create free keys at https://openrouter.ai/keys, https://console.groq.com/keys and https://cloud.cerebras.ai.
  - Set `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, and keep `GEMINI_API_KEY`.
- [ ] **A10. Security clean-up.**
  - Rotate any key that was ever shared in chat or screenshots: the Meta App Secret (then update `APP_SECRET`) and the Gemini key.
  - Set `ENABLE_DIAG=false`.
- [ ] **A11. Clinic confirmations.** Ask me to get these from the clinic, then I'll update `knowledge/flows.yaml` and `docs/VOICE_CLINIC_KNOWLEDGE.md`:
  - OPD days and timings
  - consultation fee
  - exact scheme names, coverage and documents
  - admission instructions
  - whether the ₹60k–1.2L private cost is still current
  - PIN code

## B. Real WhatsApp business number (stop for my decision first)
- [ ] **B1.** Ask me which route I want:
  - (a) a new or landline number on the Cloud API: simplest, and the number can't stay on the WhatsApp app
  - (b) coexistence with the existing WhatsApp Business app number, which needs a Meta partner/BSP
- [ ] **B2.** Meta Business verification: upload clinic documents. **I must provide the documents.**
- [ ] **B3.** Add and verify the number in WhatsApp Manager. Set the display name "The Vascular Center". Update `PHONE_NUMBER_ID` in Render.
- [ ] **B4.** Check that the webhook (Configuration → `messages` field) still points to `/webhook`. Test from my phone.

## C. Neha voice agent: hosted Bolna pilot (already started)
- [ ] **C1.** In platform.bolna.ai → Agent Studio → my agent:
  - Paste the welcome message and prompt from `docs/VOICE_PROMPT_NATURAL_MR.md` (v3).
  - Apply the settings in the "Tuning" section of `docs/VOICE_AGENT_BOLNA.md`.
- [ ] **C2.** Upload `docs/VOICE_CLINIC_KNOWLEDGE.md` to Knowledge Base and attach it to the agent.
- [ ] **C3.** Make 3 test calls to my verified number. Note in a short list anything that sounded wrong, quoting Neha's exact lines.

## D. Neha voice agent: open-source version (₹0 laptop test)
- [ ] **D1.** Create a Sarvam account at https://dashboard.sarvam.ai (free credit) and get an API key.
- [ ] **D2.** On my laptop, follow `voice/README.md` → Step 2:
  - create the venv
  - copy `.env.example` to `.env` and fill in `SARVAM_API_KEY`, `GOOGLE_API_KEY`, `ENABLE_MIC_TEST=true` (I type the keys, not you via chat)
  - run `uvicorn server:app --port 5001`
  - in a second terminal, run Bolna's `quickstart_client.py` with `ASSISTANT_ID=neha`
- [ ] **D3.** Have a 2-minute Marathi conversation with headphones on. Then copy the last line of `voice/data/calls.jsonl`, **with my phone number removed**, so Claude can review it.

## E. Neha on real phone calls (stop for my approval: costs money)
- [ ] **E1.** Plivo account (trial credit).
  - Ask me before buying an Indian number, which needs KYC.
  - On the trial, verify my own number in Plivo.
- [ ] **E2.** Small always-on server.
  - Ask me to approve a VPS (about ₹500–800/month; e.g. Hetzner, DigitalOcean or Lightsail Mumbai).
  - Install Docker. Clone the repo (branch above).
  - `cd whatsapp-clinic-bot/voice && docker build -t neha-voice .`
- [ ] **E3.** HTTPS.
  - Point a subdomain at the VPS, or use Caddy, so the voice service has an `https://` URL. Set `PUBLIC_URL`.
- [ ] **E4.** Server `.env`.
  - Set `SARVAM_API_KEY`, `GOOGLE_API_KEY`, `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, `PLIVO_PHONE_NUMBER`, `PUBLIC_URL`.
  - Set `VOICE_API_TOKEN` (`openssl rand -hex 24`).
  - Keep `ENABLE_MIC_TEST=false`.
  - Run `docker run -d --restart unless-stopped --env-file .env -p 5001:5001 neha-voice`.
- [ ] **E5.** Test call to **my number only**, using the `curl` command in `voice/README.md` Step 3. This only works 9am–8pm IST.
  - Check: Neha speaks Marathi, ends the call politely, and a result line appears in `data/calls.jsonl`.
- [ ] **E6.** Compliance before calling any patient:
  - Ask Plivo to register the number for **automated/AI calls** (TRAI requirement).
  - Confirm that we only call patients who said yes on WhatsApp.

## F. Tell Claude when these are done
- [ ] **F1.** Report back:
  - A–E status
  - the Neha test feedback (C3 and D3)
  - the clinic answers (A11)

  Claude will then build Step 4: the WhatsApp "📞 Call me" consent button, and call results going to the Sheet and email.
