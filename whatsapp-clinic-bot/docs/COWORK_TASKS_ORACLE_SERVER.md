# Cowork tasks: Neha voice server on Oracle Cloud Always Free (Mumbai)

Paste everything below the line into Claude Cowork.

---

You are helping me (Sachin) put "Neha", the Marathi voice agent for Dr. Amol Lahoti's clinic, on a **free Oracle Cloud server in Mumbai**.
- Code: GitHub repo `i5acheen/ClaudeProjects`, branch `claude/whatsapp-vascular-clinic-mvp-inqj2i`, folder `whatsapp-clinic-bot/voice/`. Read `voice/README.md` first.
- The same code already works on my Mac (laptop microphone test). Its dependencies were checked: they all have ARM64 builds, so it runs on Oracle's free Ampere (ARM) machine.

**Rules for you (Cowork):**
- **Never paste API keys, tokens, passwords or SSH private keys into chat or into GitHub.** Keys go only into the server's `.env` file, and I type or paste them myself.
- **Stop and ask me before:**
  - entering card details
  - upgrading the account
  - choosing anything that is not marked **"Always Free-eligible"**
  - anything that costs money
- **Home region must be "India West (Mumbai)" (`ap-mumbai-1`).** It can't be changed later. Stop if Mumbai isn't offered.
- After each phase, give me a 2-line status: what's done, and what's blocked.

## Phase 1. Oracle Cloud account (₹0)
- [ ] **1.1** Go to https://signup.cloud.oracle.com and sign up for **Oracle Cloud Free Tier**. Account type: Individual is fine.
- [ ] **1.2** Home region: **India West (Mumbai)**.
- [ ] **1.3** Card verification. **I enter the card myself.** Oracle may place a small temporary hold. Free-tier resources are not charged.
- [ ] **1.4** Wait for the "account ready" email (minutes to a few hours). Then sign in to the console.
- [ ] **1.5** **Ask me** about upgrading to **Pay As You Go**:
  - Why: Oracle can reclaim *idle* Always Free machines, and Neha is idle most of the day. On Pay As You Go, Always Free resources stay free and are **not** reclaimed.
  - If I agree: first create a **Budget** (Billing → Budgets) of **₹100/month** with an email alert at 1%, so any accidental charge alerts me at once.

## Phase 2. Create the free server (₹0)
- [ ] **2.1** On my Mac, create an SSH key just for this server:
  ```bash
  ssh-keygen -t ed25519 -f ~/.ssh/oracle_neha -N ""
  cat ~/.ssh/oracle_neha.pub
  ```
  Only the **.pub** (public) key is pasted into Oracle. The private key never leaves my Mac.
- [ ] **2.2** Console → **Compute → Instances → Create instance**:
  - Name: `neha-voice`
  - Image: **Canonical Ubuntu 24.04**, the **aarch64** build
  - Shape: **Ampere → VM.Standard.A1.Flex**, **2 OCPU, 12 GB RAM**. It must show **"Always Free-eligible"**; the free limit is 4 OCPU / 24 GB in total.
  - Networking: create a new VCN with a **public subnet**, and **assign a public IPv4 address**
  - SSH keys: paste the contents of `~/.ssh/oracle_neha.pub`
  - Boot volume: default (about 47 GB; free up to 200 GB)
- [ ] **2.3** If it says **"Out of host capacity"**:
  - try another Availability Domain, or 1 OCPU / 6 GB
  - or retry a few hours later
  - do **not** pick a paid shape
- [ ] **2.4** Note the instance's **public IP**, e.g. `140.238.x.y`.

## Phase 3. Open web ports (80 and 443)
- [ ] **3.1** Console → Networking → the VCN → **Security Lists → Default Security List → Add Ingress Rules**. Add two rules:
  - Source `0.0.0.0/0`, TCP, destination port **80**
  - Source `0.0.0.0/0`, TCP, destination port **443**

  Keep 22 (SSH) as it is. **Do not open 5001.**
- [ ] **3.2** SSH in from my Mac: `ssh -i ~/.ssh/oracle_neha ubuntu@<PUBLIC_IP>`
- [ ] **3.3** On the server, open the same ports in Ubuntu's firewall. Oracle's Ubuntu images block them by default. **Don't use `ufw` on Oracle**; use these iptables rules:
  ```bash
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  sudo netfilter-persistent save
  ```

## Phase 4. Install and start Neha
- [ ] **4.1** Install the software:
  ```bash
  sudo apt update && sudo apt install -y docker.io git caddy
  sudo usermod -aG docker ubuntu && newgrp docker
  ```
- [ ] **4.2** Get the code and build. The first build takes about 5–10 minutes.
  ```bash
  git clone -b claude/whatsapp-vascular-clinic-mvp-inqj2i https://github.com/i5acheen/ClaudeProjects.git
  cd ClaudeProjects/whatsapp-clinic-bot/voice
  docker build -t neha-voice .
  ```
  If the build fails, copy the **last 30 lines** (no keys) for Claude and stop.
- [ ] **4.3** Pick the HTTPS address:
  - **No domain yet? Use the free sslip.io name.** Replace the dots in the IP with dashes: IP `140.238.1.2` → `140-238-1-2.sslip.io`. Nothing to register.
  - If I have a domain, add a DNS **A record** `voice.<domain>` → public IP, and use that name instead.
- [ ] **4.4** HTTPS with Caddy, which gets the certificate automatically. Run `sudo nano /etc/caddy/Caddyfile`, replace its contents with the block below, then run `sudo systemctl restart caddy`:
  ```
  <MY-HOSTNAME> {
      reverse_proxy 127.0.0.1:5001
  }
  ```
- [ ] **4.5** Create the settings file:
  ```bash
  cp .env.example .env && chmod 600 .env && nano .env
  ```
  **I paste** `SARVAM_API_KEY` and `GOOGLE_API_KEY`. Set:
  - `PUBLIC_URL=https://<MY-HOSTNAME>`
  - `VOICE_API_TOKEN=` the output of `openssl rand -hex 24`. I save a copy in my password manager.
  - `ENABLE_MIC_TEST=false`
  - Leave the `PLIVO_*` lines empty for now. The phone line comes later.
- [ ] **4.6** Start Neha so she restarts automatically and keeps call logs:
  ```bash
  mkdir -p data
  docker run -d --name neha --restart unless-stopped --env-file .env \
    -p 127.0.0.1:5001:5001 -v "$PWD/data:/app/data" neha-voice
  ```
- [ ] **4.7** Checks:
  - On the server: `curl -s http://127.0.0.1:5001/health` should print `{"ok":true}`
  - From my Mac's browser: `https://<MY-HOSTNAME>/health` should show `{"ok":true}` with a padlock (valid HTTPS)
  - `docker logs --tail 30 neha` should show no errors

## Phase 5. Optional: talk to Neha on the server from my Mac (~10 minutes)
This checks the whole server path before the phone line exists. **While the test is on, anyone with the URL could connect, so keep it short.**
- [ ] **5.1** On the server: `nano .env` → set `ENABLE_MIC_TEST=true`. Then run `docker rm -f neha` and repeat the 4.6 run command.
- [ ] **5.2** On my Mac (voice folder, venv active, headphones on):
  `python mic_client.py --url wss://<MY-HOSTNAME>/chat/v1/neha`
  Talk for 1–2 minutes, then Ctrl+C.
- [ ] **5.3** **Immediately** set `ENABLE_MIC_TEST=false` on the server and restart again with `docker rm -f neha` and the 4.6 command. Confirm the mic test is off: `docker logs neha` should show no new connections.
- [ ] **5.4** Note whether the delay feels the same as on the Mac. It should be similar or better, since the server is in Mumbai.

## Phase 6. Keep it healthy (₹0)
- [ ] **6.1** At https://uptimerobot.com (free), add an HTTPS monitor for `https://<MY-HOSTNAME>/health` every 5 minutes, with email alerts to me.
- [ ] **6.2** Turn on automatic security updates: `sudo apt install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades`.
- [ ] **6.3** **Updating Neha later** (e.g. after Claude changes the prompt):
  ```bash
  cd ~/ClaudeProjects/whatsapp-clinic-bot/voice && git pull && docker build -t neha-voice . \
    && docker rm -f neha && docker run -d --name neha --restart unless-stopped --env-file .env \
       -p 127.0.0.1:5001:5001 -v "$PWD/data:/app/data" neha-voice
  ```

## Report back to Claude
- The status of each phase, the hostname (not secret), and the result of Phase 5 if done.
- Any error text, with no keys.

Next step after this: the Plivo phone line (`COWORK_TASKS_VOICE_ONPREM.md` → Phase 3). After that, Claude connects the WhatsApp "📞 Call me" button.
