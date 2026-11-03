#!/usr/bin/env bash
# HealthConnectCRM — one-command production install on a fresh Ubuntu 22.04/24.04 server
# (Oracle Cloud Always Free Ampere A1 in Mumbai/Hyderabad recommended; any x86/ARM VM works).
#
#   curl -fsSL https://raw.githubusercontent.com/i5acheen/ClaudeProjects/claude/eager-dijkstra-rlhuad/HealthConnectCRM/deploy/bootstrap.sh | sudo bash
#
# It installs Docker, opens ports 80/443, enables automatic security updates, downloads the CRM, asks for a
# handful of settings, generates every secret, starts the stack (Supabase, Inngest, GlitchTip, Caddy HTTPS,
# encrypted backups), applies the database migrations and creates the first admin. Re-running is safe.
#
# Non-interactive: pre-set the answers as environment variables (see "ask" calls below) and BOOTSTRAP_YES=1.
set -euo pipefail

REPO_URL=${REPO_URL:-https://github.com/i5acheen/ClaudeProjects.git}
REPO_BRANCH=${REPO_BRANCH:-claude/eager-dijkstra-rlhuad}
INSTALL_DIR=${INSTALL_DIR:-/opt/healthconnectcrm}
SKIP_SYSTEM=${SKIP_SYSTEM:-0}   # 1 = don't touch apt/docker/firewall (tests, or you manage the host yourself)
# Optional answers for non-interactive runs: PUBLIC_IP BASE_DOMAIN SITE_SCHEME ORG_NAME ADMIN_NAME ADMIN_EMAIL
# SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SENDER_EMAIL (with BOOTSTRAP_YES=1 for defaults).

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mxx %s\033[0m\n' "$*" >&2; exit 1; }

# Prompts read from the terminal even when the script itself arrives through a pipe.
ask() { # ask VAR "Question" "default" [secret]
  local var=$1 q=$2 def=${3:-} secret=${4:-} ans=""
  if [ -n "${!var:-}" ]; then return; fi
  if [ "${BOOTSTRAP_YES:-0}" = "1" ]; then printf -v "$var" '%s' "$def"; return; fi
  [ -r /dev/tty ] || die "No terminal for questions: set $var (and BOOTSTRAP_YES=1)"
  if [ -n "$secret" ]; then read -rsp "$q: " ans </dev/tty; echo; else read -rp "$q${def:+ [$def]}: " ans </dev/tty; fi
  printf -v "$var" '%s' "${ans:-$def}"
}

[ "$(id -u)" = 0 ] || die "Run as root: curl ... | sudo bash"

# ---------------------------------------------------------------------------------------------------------
if [ "$SKIP_SYSTEM" != "1" ]; then
  say "Installing system packages and automatic security updates"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl git openssl age unattended-upgrades iptables-persistent >/dev/null
  dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true

  if ! command -v docker >/dev/null 2>&1; then
    say "Installing Docker Engine + Compose"
    curl -fsSL https://get.docker.com | sh >/dev/null
  fi
  systemctl enable --now docker >/dev/null

  say "Opening ports 80 and 443 (also open them in your cloud firewall / security list)"
  for port in 80 443; do
    iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT
  done
  iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p udp --dport 443 -j ACCEPT
  netfilter-persistent save >/dev/null 2>&1 || true
fi
command -v docker >/dev/null || die "Docker is required"
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required"
command -v age-keygen >/dev/null || die "age is required (apt-get install age)"

# ---------------------------------------------------------------------------------------------------------
say "Downloading HealthConnectCRM ($REPO_BRANCH)"
if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" fetch -q origin "$REPO_BRANCH" && git -C "$INSTALL_DIR" checkout -q "$REPO_BRANCH" && git -C "$INSTALL_DIR" pull -q --ff-only
else
  git clone -q --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi
APP="$INSTALL_DIR/HealthConnectCRM"
[ -f "$APP/deploy/setup.sh" ] || die "Unexpected repository layout at $APP"

# ---------------------------------------------------------------------------------------------------------
if [ ! -f "$APP/deploy/site.env" ]; then
  say "A few questions (press Enter to accept the default)"
  PUBLIC_IP=${PUBLIC_IP:-$(curl -4fsS --max-time 10 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)}
  [ -n "$PUBLIC_IP" ] || ask PUBLIC_IP "This server's public IPv4 address" ""
  SSLIP=$(echo "$PUBLIC_IP" | tr . -).sslip.io
  echo "No domain yet? The default uses a free sslip.io address that points at $PUBLIC_IP; you can switch to your own domain later."
  ask BASE_DOMAIN "Domain for the CRM (e.g. crm.yourclinic.in)" "crm.$SSLIP"
  ask SITE_SCHEME "Scheme (https for production)" "https"
  ask ORG_NAME "Organisation name" "HealthConnect"
  ask ADMIN_NAME "First admin's full name" "Admin"
  ask ADMIN_EMAIL "First admin's e-mail (sign-in codes and certificate notices go here)" ""
  [ -n "$ADMIN_EMAIL" ] || die "An admin e-mail is required"
  echo "Login codes are sent by e-mail. A Gmail account works: create an App Password at https://myaccount.google.com/apppasswords"
  ask SMTP_HOST "SMTP host" "smtp.gmail.com"
  ask SMTP_PORT "SMTP port" "587"
  ask SMTP_USER "SMTP user" "$ADMIN_EMAIL"
  ask SMTP_PASS "SMTP password / app password" "" secret
  SMTP_PASS=${SMTP_PASS// /}   # Gmail shows app passwords in groups of four; spaces are not part of it
  case "$SMTP_PASS" in *"'"*) die "The SMTP password must not contain a single quote (') — create a new app password";; esac
  ask SENDER_EMAIL "Send login e-mails from (must be allowed by your SMTP account)" "$SMTP_USER"

  say "Creating the backup encryption key"
  KEYDIR=$(mktemp -d)   # age-keygen refuses to overwrite, so give it a fresh path
  age-keygen -o "$KEYDIR/backup.agekey" 2>/dev/null
  BACKUP_PUB=$(grep -o 'age1[0-9a-z]*' "$KEYDIR/backup.agekey" | head -1)
  BACKUP_PRIVATE=$(grep '^AGE-SECRET-KEY-' "$KEYDIR/backup.agekey")
  rm -rf -- "$KEYDIR"
  [ -n "$BACKUP_PUB" ] && [ -n "$BACKUP_PRIVATE" ] || die "Could not create the backup key"

  umask 077
  cat >"$APP/deploy/site.env" <<EOF
SITE_SCHEME=$SITE_SCHEME
APP_HOST=$BASE_DOMAIN
API_HOST=api.$BASE_DOMAIN
ERRORS_HOST=errors.$BASE_DOMAIN
ADMIN_EMAIL=$SENDER_EMAIL
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS='$SMTP_PASS'
SMTP_SENDER_NAME="$ORG_NAME CRM"
BACKUP_AGE_RECIPIENT=$BACKUP_PUB
BACKUP_RCLONE_REMOTE=
EOF
  printf '%s\n' "$ORG_NAME" >"$APP/deploy/.org_name"
  printf '%s\n%s\n' "$ADMIN_EMAIL" "$ADMIN_NAME" >"$APP/deploy/.first_admin"
else
  say "Reusing existing deploy/site.env"
  BACKUP_PRIVATE=""
fi

# ---------------------------------------------------------------------------------------------------------
say "Generating secrets and configuration"
sh "$APP/deploy/setup.sh" >/dev/null

say "Building and starting the stack (first run takes 5–15 minutes)"
cd "$APP/deploy/supabase"
# SKIP_BUILD=1 uses already-built images (CI / prebuilt); normally the app image is built here.
if [ "${SKIP_BUILD:-0}" = "1" ]; then docker compose up -d --no-build --quiet-pull; else docker compose up -d --build --quiet-pull; fi

say "Waiting for the database"
for _ in $(seq 1 90); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' supabase-db 2>/dev/null)" = "healthy" ] && break
  sleep 2
done
[ "$(docker inspect -f '{{.State.Health.Status}}' supabase-db 2>/dev/null)" = "healthy" ] || die "Database did not become healthy: docker compose logs db"

say "Applying database migrations"
sh "$APP/deploy/migrate.sh"

if [ -f "$APP/deploy/.first_admin" ]; then
  say "Waiting for the auth service, then creating the first admin"
  for _ in $(seq 1 60); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' supabase-auth 2>/dev/null)" = "healthy" ] && break
    sleep 2
  done
  { read -r A_EMAIL; read -r A_NAME; } <"$APP/deploy/.first_admin"
  sh "$APP/deploy/create-admin.sh" "$(cat "$APP/deploy/.org_name")" "$A_EMAIL" "$A_NAME" && rm -f "$APP/deploy/.first_admin"
fi

# ---------------------------------------------------------------------------------------------------------
set -a; . "$APP/deploy/site.env"; set +a
URL="$SITE_SCHEME://$APP_HOST"
say "Waiting for $URL (HTTPS certificates are issued on first visit; allow a minute)"
ok=""
for _ in $(seq 1 60); do
  if curl -fsS --max-time 10 "$URL/api/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 5
done
[ -n "$ok" ] && say "The CRM is up: $URL" || warn "Not reachable yet at $URL — check DNS, ports 80/443 in your cloud firewall, then: docker compose logs caddy"

cat <<EOF

────────────────────────────────────────────────────────────────────────────
 HealthConnectCRM is installed.

 CRM ............ $URL   (sign in as your admin e-mail; a 6-digit code is e-mailed)
 Health ......... $URL/api/health
 Error tracking . $SITE_SCHEME://$ERRORS_HOST   (create the first user:
                  cd $APP/deploy/supabase && docker compose exec errors ./manage.py createsuperuser)
 Studio / jobs .. private — from your laptop: ssh -L 8000:127.0.0.1:8000 -L 8288:127.0.0.1:8288 <user>@<server>
                  then http://localhost:8000 (Supabase Studio) and http://localhost:8288 (Inngest)
 Secrets ........ $APP/deploy/supabase/.env and crm.env (root-only). Keep an encrypted copy off the server.
 Meta / WhatsApp  fill META_* and WA_* in crm.env when ready, then: docker compose up -d app
                  (docs/META_SETUP.md, docs/WHATSAPP_SETUP.md). Until then the CRM works without them.
 Updates ........ sudo bash $APP/deploy/update.sh
────────────────────────────────────────────────────────────────────────────
EOF
if [ -n "$BACKUP_PRIVATE" ]; then
  cat <<EOF

 !! BACKUP PRIVATE KEY — shown ONCE and not stored on this server.
 !! Save it in your password manager now. Without it, backups cannot be restored.

    $BACKUP_PRIVATE

EOF
fi
