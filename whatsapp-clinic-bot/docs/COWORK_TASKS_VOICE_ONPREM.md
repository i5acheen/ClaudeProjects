# Cowork tasks: on-prem (self-hosted) Neha voice agent

Paste everything below the line into Claude Cowork. This covers **only** the self-hosted voice agent in
`whatsapp-clinic-bot/voice/`: open-source Bolna engine + Sarvam (Marathi STT/TTS) + Gemini + Plivo.

---

You are helping me (Sachin) set up **"Neha"**, a Marathi voice agent for Dr. Amol Lahoti's clinic (The Vascular Center).
It runs on our own server using the open-source Bolna engine.
- Code: GitHub repo `i5acheen/ClaudeProjects`, branch `claude/whatsapp-vascular-clinic-mvp-inqj2i`, folder `whatsapp-clinic-bot/voice/`.
- **Read `voice/README.md` first.** Settings are listed in `voice/.env.example`.

**Rules for you (Cowork):**
- **Never paste API keys, tokens or passwords into chat or into any file that goes to GitHub.** Keys go only into the `.env` file on my laptop or the server, typed or pasted straight from the provider's dashboard.
- **Stop and ask me before:** paying for anything, buying a phone number, KYC or identity documents, or calling any number other than mine.
- Test calls go **only to my own number**, and only between **9am and 8pm IST**.
- After each phase, give me a 2-line status: what's done, and what's blocked.

## Phase 1. Accounts and keys (₹0)
- [ ] **1.1 Sarvam** (Marathi listening + voice): sign up at https://dashboard.sarvam.ai, which gives free credit. Create an API key. Keep the dashboard tab open; don't copy the key anywhere yet.
- [ ] **1.2 Gemini key:** use my existing key from https://aistudio.google.com/apikey, or create a new one. Same rule: don't put it in chat.
- [ ] **1.3** Check that Sarvam shows free credit, and that the Gemini key is on the free tier (no billing needed).

## Phase 2. ₹0 test on my laptop (talk to Neha by microphone)
- [ ] **2.1** Check that Python 3.11 is installed (`python3.11 --version`). On a Mac, also run `brew install portaudio`. On Windows, use WSL or ask me.
- [ ] **2.2** Get the code:
  ```bash
  git clone -b claude/whatsapp-vascular-clinic-mvp-inqj2i https://github.com/i5acheen/ClaudeProjects.git
  cd ClaudeProjects/whatsapp-clinic-bot/voice
  python3.11 -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  cp .env.example .env
  ```
- [ ] **2.3** Open `.env` in an editor. **I paste** `SARVAM_API_KEY` and `GOOGLE_API_KEY`. Set `ENABLE_MIC_TEST=true` and `TEST_PATIENT_NAME=<my name in Marathi>`.
- [ ] **2.4** Start the server: `uvicorn server:app --port 5001`. Check that http://localhost:5001/health shows `{"ok":true}`.
- [ ] **2.5** In a second terminal (same folder, venv active):
  ```bash
  pip install pyaudio sounddevice websockets numpy
  curl -O https://raw.githubusercontent.com/bolna-ai/bolna/8c6dea525ae1e6ef24ca7f9568eb83c7e272ad5b/local_setup/quickstart_client.py
  ASSISTANT_ID=neha python quickstart_client.py
  ```
- [ ] **2.6** I talk to Neha **with headphones on**, about 2 minutes in Marathi. Try these:
  - "हो, बोला"
  - "पाय दुखतात, सहा महिने झाले"
  - "खर्च किती?"
  - "पिवळं रेशन कार्ड आहे"
  - "शनिवारी सकाळी"
  - "तुम्ही रोबोट आहात का?"
- [ ] **2.7** Collect for Claude, with phone numbers removed:
  - the last line of `data/calls.jsonl`
  - any error lines from the server terminal
  - my notes: voice quality, speed, pauses, wrong words
- [ ] **2.8** If something fails, copy the **error text only** (no keys) and stop. Claude will fix the code.

## Phase 3. Phone line: Plivo (stop for my approval before paying)
- [ ] **3.1** Sign up at https://www.plivo.com (trial credit). On the trial, add and verify **my own mobile** as a test/sandbox number.
- [ ] **3.2** **Ask me before buying.** Get an Indian phone number (needs KYC: business documents). Ask Plivo support:
  - how to register the number for **automated/AI voice calls** (TRAI 2026 rule)
  - whether the trial can call Indian mobiles
- [ ] **3.3** Note down (don't share in chat) the Auth ID, Auth Token and the number in `91XXXXXXXXXX` format.
- [ ] **3.4** No Plivo "Application" or answer-URL setup is needed. Our server sends the answer URL with each call.

## Phase 4. Server (stop for my approval: ~₹500–800/month)
- [ ] **4.1** **Ask me to approve** a small always-on Linux VPS: 2 vCPU / 2–4 GB RAM, Ubuntu 24.04, in a **Mumbai** region for low delay. For example: DigitalOcean BLR/Mumbai, AWS Lightsail Mumbai, Hetzner, or E2E Networks. Render's free plan won't work because it sleeps.
- [ ] **4.2** Point a subdomain at the server's IP (DNS A record), e.g. `voice.<my-domain>`. If I have no domain, ask me. A cheap domain or the provider's hostname is fine.
- [ ] **4.3** On the server:
  ```bash
  sudo apt update && sudo apt install -y docker.io git caddy ufw
  sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable
  git clone -b claude/whatsapp-vascular-clinic-mvp-inqj2i https://github.com/i5acheen/ClaudeProjects.git
  cd ClaudeProjects/whatsapp-clinic-bot/voice && sudo docker build -t neha-voice .
  ```
  Port 5001 stays closed to the internet. Only Caddy (443) is public.
- [ ] **4.4** HTTPS with Caddy. Websockets work automatically. Put this in `/etc/caddy/Caddyfile`, then `sudo systemctl reload caddy`:
  ```
  voice.<my-domain> {
      reverse_proxy 127.0.0.1:5001
  }
  ```
- [ ] **4.5** Create `.env` on the server: `cp .env.example .env && chmod 600 .env`. **I paste** the keys. Set:
  - `SARVAM_API_KEY`, `GOOGLE_API_KEY`
  - `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, `PLIVO_PHONE_NUMBER`
  - `PUBLIC_URL=https://voice.<my-domain>`
  - `VOICE_API_TOKEN=` the output of `openssl rand -hex 24`. Keep a copy in my password manager.
  - `ENABLE_MIC_TEST=false`, `CALL_START_HOUR=9`, `CALL_END_HOUR=20`
- [ ] **4.6** Start the service so it restarts automatically and keeps call logs:
  ```bash
  mkdir -p data
  sudo docker run -d --name neha --restart unless-stopped --env-file .env \
    -p 127.0.0.1:5001:5001 -v "$PWD/data:/app/data" neha-voice
  ```
- [ ] **4.7** Check that `https://voice.<my-domain>/health` shows `{"ok":true}`, and that `sudo docker logs neha` shows no errors.

## Phase 5. First real call (my number only, 9am–8pm IST)
- [ ] **5.1** On the server, run this (it reads the token from `.env`; nothing is printed):
  ```bash
  source .env && curl -s -X POST "$PUBLIC_URL/calls" \
    -H "X-Voice-Token: $VOICE_API_TOKEN" -H "Content-Type: application/json" \
    -d '{"phone":"91<MY_NUMBER>","patient_name":"<my name>","concern":"पायाच्या शिरा फुगणे","call_reason":"WhatsApp वर कॉलसाठी विनंती"}'
  ```
- [ ] **5.2** I answer and run the same test lines as in 2.6. Also test:
  - "मला फोन करू नका" (she should apologise and end the call)
  - "छातीत दुखतंय" (she should say call 108, then end the call)
- [ ] **5.3** Check that `data/calls.jsonl` has a new line with `outcome`, `summary` and the transcript, and that `docker logs neha` shows "Call …XXXX finished".
- [ ] **5.4** Send Claude my notes, plus the result line with the phone number removed. If something broke, send the error text only.

## Phase 6. Before calling any patient
- [ ] **6.1** Plivo confirms in writing that the number is registered for automated calls.
- [ ] **6.2** The clinic has confirmed: OPD timings, consultation fee, scheme names and documents, admission instructions. Claude updates `voice/agent/neha_prompt_mr.md` with these.
- [ ] **6.3** Claude builds the WhatsApp **"📞 Call me" consent button** and the result link to the Google Sheet and email. Until then, call only people who personally said yes.
- [ ] **6.4** Set a Plivo **low-balance alert** and a monthly spend limit, as I decide.

## Day-to-day operations (after go-live)
- **Update Neha's wording:**
  - edit `voice/agent/neha_prompt_mr.md` and `welcome_mr.txt` in GitHub
  - on the server: `git pull && sudo docker build -t neha-voice . && sudo docker rm -f neha` then repeat the 4.6 run command
- **Logs:** `sudo docker logs --tail 100 neha`. Call results: `data/calls.jsonl`. Contains patient data, so keep the server private.
- **Costs to watch:** Sarvam credit balance, Plivo balance, and Gemini free-tier limits (check the AI Studio usage page).
